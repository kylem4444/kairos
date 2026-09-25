import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentArtwork,
  markAutoDestroyed,
} from "@/lib/artwork-service";
import { isPastZero } from "@/lib/price";

export const dynamic = "force-dynamic";

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in local/demo when no secret is set
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Backup for the page-load flip in getArtworkPublicView.
 * Vercel Cron calls this on the vercel.json schedule: daily at 00:00 UTC
 * (`0 0 * * *`), which fits the Hobby once-per-day cron limit.
 * If the week has ended and the piece is still live, flip it to auto_destroyed.
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const artwork = await getCurrentArtwork();
    if (!artwork) {
      return NextResponse.json({ ok: true, action: "none", reason: "no_artwork" });
    }

    if (artwork.status !== "live") {
      return NextResponse.json({
        ok: true,
        action: "none",
        reason: "not_live",
        status: artwork.status,
      });
    }

    if (!isPastZero(artwork.live_at, artwork.duration_ms)) {
      return NextResponse.json({
        ok: true,
        action: "none",
        reason: "still_in_window",
      });
    }

    const updated = await markAutoDestroyed(artwork.id);
    return NextResponse.json({
      ok: true,
      action: updated ? "auto_destroyed" : "none",
      artwork: updated,
    });
  } catch (error) {
    console.error("GET /api/cron/zero-price", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
