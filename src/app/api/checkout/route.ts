import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentArtwork,
  isDemoMode,
  logCheckoutSession,
} from "@/lib/artwork-service";
import { computePriceCents } from "@/lib/price";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import type { Outcome } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { outcome?: string };
    const outcome = body.outcome;

    if (outcome !== "purchase" && outcome !== "destroy") {
      return NextResponse.json(
        { error: "outcome must be purchase or destroy" },
        { status: 400 },
      );
    }

    const artwork = await getCurrentArtwork();
    if (!artwork || artwork.status !== "live") {
      return NextResponse.json(
        {
          error: "unavailable",
          message:
            "This artwork is no longer available. Someone else may have already claimed it.",
        },
        { status: 409 },
      );
    }

    const amountCents = computePriceCents({
      startPriceCents: artwork.start_price_cents,
      liveAt: artwork.live_at,
      durationMs: artwork.duration_ms,
    });

    if (amountCents <= 0) {
      return NextResponse.json(
        {
          error: "price_zero",
          message: "The price has reached zero. The artwork will be destroyed on livestream.",
        },
        { status: 409 },
      );
    }

    // Demo mode without Stripe: simulate an immediate claim path via a fake session
    if (!isStripeConfigured()) {
      if (!isDemoMode()) {
        return NextResponse.json(
          { error: "Stripe is not configured." },
          { status: 503 },
        );
      }

      const fakeSessionId = `demo_cs_${crypto.randomUUID()}`;
      await logCheckoutSession({
        stripe_session_id: fakeSessionId,
        artwork_id: artwork.id,
        outcome: outcome as Outcome,
        amount_cents: amountCents,
      });

      const settleUrl = `${getAppUrl()}/?demo_settle=1&session_id=${fakeSessionId}&outcome=${outcome}&amount=${amountCents}`;
      return NextResponse.json({
        url: settleUrl,
        demo: true,
        amountCents,
      });
    }

    const stripe = getStripe();
    const label =
      outcome === "purchase"
        ? `Purchase: ${artwork.title}`
        : `Destroy: ${artwork.title}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${getAppUrl()}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/?checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: label,
              description:
                outcome === "purchase"
                  ? "You are purchasing this artwork at the current decaying price."
                  : "You are paying the current price to destroy this artwork.",
              images: artwork.image_url.startsWith("http")
                ? [artwork.image_url]
                : undefined,
            },
          },
        },
      ],
      metadata: {
        artworkId: artwork.id,
        outcome,
      },
      payment_intent_data: {
        metadata: {
          artworkId: artwork.id,
          outcome,
        },
      },
    });

    await logCheckoutSession({
      stripe_session_id: session.id,
      artwork_id: artwork.id,
      outcome: outcome as Outcome,
      amount_cents: amountCents,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      amountCents,
    });
  } catch (error) {
    console.error("POST /api/checkout", error);
    return NextResponse.json(
      { error: "Failed to start checkout." },
      { status: 500 },
    );
  }
}
