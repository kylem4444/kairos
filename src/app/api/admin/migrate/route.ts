import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { applyGalleryMigration } from "@/lib/gallery-migration";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const result = await applyGalleryMigration();
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "migration_failed",
          message: result.error,
          sql: result.sql,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      alreadyApplied: Boolean(result.alreadyApplied),
      method: result.method,
      message: result.alreadyApplied
        ? "Migration already applied."
        : "Migration applied. Mark as test and analytics should work now.",
    });
  } catch (error) {
    console.error("POST /api/admin/migrate", error);
    return NextResponse.json(
      {
        error: "migration_failed",
        message:
          error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 },
    );
  }
}
