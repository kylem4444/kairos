import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import {
  deleteArtwork,
  getArtworkById,
  updateArtwork,
} from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    const artwork = await getArtworkById(id);
    if (!artwork) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ artwork });
  } catch (error) {
    console.error("GET /api/admin/artworks/[id]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      image_url?: string;
      image_urls?: string[];
      start_price_cents?: number;
      duration_ms?: number;
      livestream_url?: string | null;
    };

    const artwork = await updateArtwork(id, body);
    if (!artwork) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    console.error("PATCH /api/admin/artworks/[id]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    const existing = await getArtworkById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          error: "not_draft",
          message: "Only draft artworks can be deleted.",
        },
        { status: 409 },
      );
    }

    const deleted = await deleteArtwork(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Could not delete artwork" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/artworks/[id]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
