import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { createArtwork, listArtworks } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const artworks = await listArtworks();
    return NextResponse.json({ artworks });
  } catch (error) {
    console.error("GET /api/admin/artworks", error);
    return NextResponse.json(
      { error: "Failed to list artworks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      start_price_cents?: number;
      duration_ms?: number;
      image_url?: string;
      image_urls?: string[];
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const artwork = await createArtwork({
      title: body.title.trim(),
      description: body.description,
      start_price_cents: body.start_price_cents,
      duration_ms: body.duration_ms,
      image_url: body.image_url,
      image_urls: body.image_urls,
    });

    return NextResponse.json({ ok: true, artwork }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/artworks", error);
    return NextResponse.json(
      { error: "Failed to create artwork" },
      { status: 500 },
    );
  }
}
