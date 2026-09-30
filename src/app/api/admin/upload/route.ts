import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import {
  appendArtworkImages,
  appendDestroyedImages,
  getArtworkById,
  uploadArtworkImage,
} from "@/lib/artwork-service";
import { isDestroyedStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const artworkId = String(form.get("artworkId") ?? "");
    const kind = String(form.get("kind") ?? "artwork");
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File);

    if (!artworkId) {
      return NextResponse.json(
        { error: "artworkId required" },
        { status: 400 },
      );
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "files required" }, { status: 400 });
    }

    if (kind === "destroyed") {
      const existing = await getArtworkById(artworkId);
      if (!existing || !isDestroyedStatus(existing.status)) {
        return NextResponse.json(
          {
            error: "not_destroyed",
            message: "Destroyed photos can only be added to destroyed pieces.",
          },
          { status: 409 },
        );
      }
    }

    const urls: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadArtworkImage({
        buffer,
        contentType: file.type || "image/jpeg",
        filename: file.name || "upload.jpg",
      });
      urls.push(url);
    }

    const artwork =
      kind === "destroyed"
        ? await appendDestroyedImages(artworkId, urls)
        : await appendArtworkImages(artworkId, urls);

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, urls, artwork });
  } catch (error) {
    console.error("POST /api/admin/upload", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
