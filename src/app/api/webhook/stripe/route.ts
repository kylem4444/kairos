import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { trackAnalyticsEvent } from "@/lib/analytics";
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
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentSucceeded(paymentIntent);
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

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  const stripe = getStripe();
  const artworkId = paymentIntent.metadata?.artworkId;
  const outcome = paymentIntent.metadata?.outcome as Outcome | undefined;
  const amountCents = paymentIntent.amount_received || paymentIntent.amount;

  if (!artworkId || (outcome !== "purchase" && outcome !== "destroy")) {
    console.error("PaymentIntent missing metadata", paymentIntent.id);
    return;
  }

  const { claimed, alreadySettled } = await claimArtwork({
    artworkId,
    sessionId: paymentIntent.id,
    outcome,
    amountCents,
  });

  if (claimed) {
    // Cancel every other open PaymentIntent so nobody else can finish paying
    const open = await listOpenSessions(artworkId);
    const losers = open.filter(
      (s) => s.stripe_session_id !== paymentIntent.id,
    );

    await Promise.all(
      losers.map(async (loser) => {
        try {
          await stripe.paymentIntents.cancel(loser.stripe_session_id);
        } catch (err) {
          // May already be succeeded/canceled — continue
          console.warn(
            "Failed to cancel payment intent",
            loser.stripe_session_id,
            err,
          );
        }
      }),
    );

    await markSessionsExpired(losers.map((s) => s.stripe_session_id));

    await trackAnalyticsEvent({
      name: "payment_succeeded",
      artwork_id: artworkId,
      meta: {
        outcome,
        amountCents,
        paymentIntentId: paymentIntent.id,
      },
    });
    return;
  }

  if (alreadySettled) {
    // Someone else won first — refund this payment
    try {
      await stripe.refunds.create({ payment_intent: paymentIntent.id });
    } catch (err) {
      console.error("Refund failed for late payment", paymentIntent.id, err);
    }

    try {
      await markSessionsExpired([paymentIntent.id]);
    } catch {
      /* ignore */
    }
  }
}
