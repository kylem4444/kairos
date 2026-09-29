import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import {
  getCurrentArtwork,
  goLive,
  isDemoMode,
  resetDemoArtwork,
  setLivestreamUrl,
} from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

/**
 * Legacy admin helpers (Bearer or session cookie):
 * - { action: "go-live", artworkId? }
 * - { action: "set-livestream", url, artworkId? }
 * - { action: "reset-demo" }
 */
export async function POST(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

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
      try {
        const artwork = await goLive(artworkId);
        if (!artwork) {
          return NextResponse.json(
            { error: "Could not go live (must be draft)" },
            { status: 409 },
          );
        }
        return NextResponse.json({ ok: true, artwork });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Go live failed";
        return NextResponse.json({ error: message }, { status: 409 });
      }
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
