import { NextRequest, NextResponse } from "next/server";
import { getArtworkPublicView, getCheckoutSession } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

/**
 * After Stripe redirects back, the client can ask whether this session won.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    const view = await getArtworkPublicView();
    const session = await getCheckoutSession(sessionId);

    if (!view) {
      return NextResponse.json({ status: "unknown" });
    }

    const { artwork } = view;
    const youWon =
      artwork.winning_session_id === sessionId &&
      (artwork.status === "purchased" || artwork.status === "destroyed");

    const someoneElse =
      (artwork.status === "purchased" ||
        artwork.status === "destroyed" ||
        artwork.status === "auto_destroyed") &&
      artwork.winning_session_id !== sessionId;

    return NextResponse.json({
      youWon,
      someoneElse,
      sessionStatus: session?.status ?? null,
      artworkStatus: artwork.status,
      settledOutcome: artwork.settled_outcome,
      settledAmountCents: artwork.settled_amount_cents,
    });
  } catch (error) {
    console.error("GET /api/checkout/status", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
