import { NextRequest, NextResponse } from "next/server";
import {
  claimArtwork,
  getCheckoutSession,
  isDemoMode,
  listOpenSessions,
  markSessionsExpired,
} from "@/lib/artwork-service";
import type { Outcome } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Demo-only: simulates a successful Stripe webhook so you can test
 * Purchase / Destroy without Stripe keys.
 */
export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json(
      { error: "Demo settle is only available in demo mode." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      session_id?: string;
      outcome?: Outcome;
      amount?: number;
    };

    if (!body.session_id || !body.outcome || body.amount == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const session = await getCheckoutSession(body.session_id);
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }

    const { claimed, alreadySettled } = await claimArtwork({
      artworkId: session.artwork_id,
      sessionId: body.session_id,
      outcome: body.outcome,
      amountCents: body.amount,
    });

    if (claimed) {
      const open = await listOpenSessions(session.artwork_id);
      const losers = open
        .filter((s) => s.stripe_session_id !== body.session_id)
        .map((s) => s.stripe_session_id);
      await markSessionsExpired(losers);

      return NextResponse.json({
        ok: true,
        winner: true,
        artwork: claimed,
      });
    }

    return NextResponse.json({
      ok: true,
      winner: false,
      alreadySettled,
      message: "Someone else already claimed this artwork.",
    });
  } catch (error) {
    console.error("POST /api/demo/settle", error);
    return NextResponse.json({ error: "Settle failed" }, { status: 500 });
  }
}
