import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentArtwork,
  goLive,
  isDemoMode,
  resetDemoArtwork,
  setLivestreamUrl,
} from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

function authorize(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return isDemoMode() || process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Admin helpers:
 * - { action: "go-live", artworkId? }
 * - { action: "set-livestream", url, artworkId? }
 * - { action: "reset-demo" }  // demo mode only
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      artworkId?: string;
      url?: string;
    };

    if (body.action === "reset-demo") {
      if (!isDemoMode()) {
        return NextResponse.json(
          { error: "Only available in demo mode" },
          { status: 403 },
        );
      }
      const artwork = await resetDemoArtwork();
      return NextResponse.json({ ok: true, artwork });
    }

    const current = await getCurrentArtwork();
    const artworkId = body.artworkId ?? current?.id;

    if (!artworkId) {
      return NextResponse.json(
        { error: "No artwork id provided or found" },
        { status: 400 },
      );
    }

    if (body.action === "go-live") {
      const artwork = await goLive(artworkId);
      if (!artwork) {
        return NextResponse.json(
          { error: "Could not go live (must be draft, or use reset-demo)" },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true, artwork });
    }

    if (body.action === "set-livestream") {
      if (!body.url) {
        return NextResponse.json({ error: "url required" }, { status: 400 });
      }
      const artwork = await setLivestreamUrl(artworkId, body.url);
      return NextResponse.json({ ok: true, artwork });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin", error);
    return NextResponse.json({ error: "Admin action failed" }, { status: 500 });
  }
}
