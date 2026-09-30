import { NextResponse } from "next/server";
import { listArchiveArtworks } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const artworks = await listArchiveArtworks();
    return NextResponse.json({ artworks });
  } catch (error) {
    console.error("GET /api/gallery", error);
    return NextResponse.json(
      { error: "Failed to load gallery" },
      { status: 500 },
    );
  }
}
