import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { goLive } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    const artwork = await goLive(id);
    if (!artwork) {
      return NextResponse.json(
        {
          error: "could_not_go_live",
          message: "Artwork must be in draft status.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to go live";
    if (message.includes("already live")) {
      return NextResponse.json(
        {
          error: "already_live",
          message: "Another artwork is already live. Finish or wait for it.",
        },
        { status: 409 },
      );
    }
    console.error("POST go-live", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
