import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  isAuthorizedAdmin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { getAdminAnalytics } from "@/lib/analytics";
import { formatUsdFromCents } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (adminConfigError()) return adminUnavailableResponse();
  if (!isAuthorizedAdmin(request)) return unauthorizedResponse();

  try {
    const analytics = await getAdminAnalytics();
    return NextResponse.json({
      ...analytics,
      lifetimeRevenueFormatted: formatUsdFromCents(
        analytics.lifetimeRevenueCents,
      ),
    });
  } catch (error) {
    console.error("GET /api/admin/analytics", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
