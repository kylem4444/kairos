import { NextRequest, NextResponse } from "next/server";
import {
  claimArtwork,
  getCurrentArtwork,
  isDemoMode,
  listOpenSessions,
  logCheckoutSession,
  markSessionsExpired,
} from "@/lib/artwork-service";
import { computePriceCents } from "@/lib/price";
import { getAppUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import type { Outcome } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Create a PaymentIntent at the exact current decaying price (deferred intent).
 * Demo mode without Stripe claims immediately.
 */
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
          message:
            "The price has reached zero. The artwork will be destroyed on livestream.",
        },
        { status: 409 },
      );
    }

    // Stripe card payments require at least $0.50 USD
    if (isStripeConfigured() && amountCents < 50) {
      return NextResponse.json(
        {
          error: "price_below_minimum",
          message:
            "The price is below Stripe’s $0.50 minimum. Wait for auto-destroy at zero, or try again sooner.",
        },
        { status: 409 },
      );
    }

    // Demo without Stripe: simulate an immediate successful payment
    if (!isStripeConfigured()) {
      if (!isDemoMode()) {
        return NextResponse.json(
          { error: "Stripe is not configured." },
          { status: 503 },
        );
      }

      const fakeSessionId = `demo_pi_${crypto.randomUUID()}`;
      await logCheckoutSession({
        stripe_session_id: fakeSessionId,
        artwork_id: artwork.id,
        outcome: outcome as Outcome,
        amount_cents: amountCents,
      });

      const { claimed, alreadySettled } = await claimArtwork({
        artworkId: artwork.id,
        sessionId: fakeSessionId,
        outcome: outcome as Outcome,
        amountCents,
      });

      if (claimed) {
        const open = await listOpenSessions(artwork.id);
        const losers = open
          .filter((s) => s.stripe_session_id !== fakeSessionId)
          .map((s) => s.stripe_session_id);
        await markSessionsExpired(losers);

        return NextResponse.json({
          demo: true,
          youWon: true,
          paymentIntentId: fakeSessionId,
          amountCents,
          outcome,
        });
      }

      return NextResponse.json({
        demo: true,
        youWon: false,
        alreadySettled,
        paymentIntentId: fakeSessionId,
        amountCents,
        message: "Someone else already claimed this artwork.",
      });
    }

    const stripe = getStripe();
    const label =
      outcome === "purchase"
        ? `Purchase: ${artwork.title}`
        : `Destroy: ${artwork.title}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: label,
      metadata: {
        artworkId: artwork.id,
        outcome,
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "Failed to create payment intent." },
        { status: 500 },
      );
    }

    await logCheckoutSession({
      stripe_session_id: paymentIntent.id,
      artwork_id: artwork.id,
      outcome: outcome as Outcome,
      amount_cents: amountCents,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      returnUrl: `${getAppUrl()}/?checkout=return&session_id=${paymentIntent.id}`,
    });
  } catch (error) {
    console.error("POST /api/checkout/confirm", error);
    return NextResponse.json(
      { error: "Failed to start payment." },
      { status: 500 },
    );
  }
}
