import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  claimArtwork,
  listOpenSessions,
  markSessionsExpired,
} from "@/lib/artwork-service";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type { Outcome } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature configuration." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const artworkId = session.metadata?.artworkId;
  const outcome = session.metadata?.outcome as Outcome | undefined;
  const amountCents = session.amount_total ?? 0;

  if (!artworkId || (outcome !== "purchase" && outcome !== "destroy")) {
    console.error("Checkout session missing metadata", session.id);
    return;
  }

  const { claimed, alreadySettled } = await claimArtwork({
    artworkId,
    sessionId: session.id,
    outcome,
    amountCents,
  });

  if (claimed) {
    // Expire every other open session so nobody else can finish paying
    const open = await listOpenSessions(artworkId);
    const losers = open.filter((s) => s.stripe_session_id !== session.id);

    await Promise.all(
      losers.map(async (loser) => {
        try {
          await stripe.checkout.sessions.expire(loser.stripe_session_id);
        } catch (err) {
          // Session may already be complete/expired — continue
          console.warn("Failed to expire session", loser.stripe_session_id, err);
        }
      }),
    );

    await markSessionsExpired(losers.map((s) => s.stripe_session_id));
    return;
  }

  if (alreadySettled) {
    // Someone else won first — refund this payment
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      } catch (err) {
        console.error("Refund failed for late payment", paymentIntentId, err);
      }
    }

    try {
      // Mark this session expired in our DB if still open
      await markSessionsExpired([session.id]);
    } catch {
      /* ignore */
    }
  }
}
