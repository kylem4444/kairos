import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { getAnalyticsGeo } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const geo = await getAnalyticsGeo();
    return NextResponse.json(geo);
  } catch (error) {
    console.error("GET /api/admin/analytics/geo", error);
    return NextResponse.json(
      { error: "Failed to load geo analytics" },
      { status: 500 },
    );
  }
}
