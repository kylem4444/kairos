import { NextResponse } from "next/server";
import { getArtworkPublicView } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const view = await getArtworkPublicView();
    if (!view) {
      return NextResponse.json(
        { error: "No artwork is currently available." },
        { status: 404 },
      );
    }
    return NextResponse.json(view);
  } catch (error) {
    console.error("GET /api/artwork", error);
    return NextResponse.json(
      { error: "Failed to load artwork." },
      { status: 500 },
    );
  }
}
