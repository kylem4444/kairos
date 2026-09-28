import { NextResponse } from "next/server";
import { getCurrentArtwork, isDemoMode } from "@/lib/artwork-service";
import { computePriceCents } from "@/lib/price";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Lightweight readiness check before opening the embedded payment panel.
 * Actual charging happens in POST /api/checkout/confirm at Pay-click time.
 */
export async function GET() {
  try {
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

    const stripeConfigured = isStripeConfigured();
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

    if (!stripeConfigured && !isDemoMode()) {
      return NextResponse.json(
        { error: "Stripe is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      amountCents,
      demo: !stripeConfigured,
      publishableKey: stripeConfigured ? publishableKey : null,
    });
  } catch (error) {
    console.error("GET /api/checkout", error);
    return NextResponse.json(
      { error: "Checkout readiness check failed." },
      { status: 500 },
    );
  }
}
