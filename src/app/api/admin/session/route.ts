import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  isAuthorizedAdmin,
  readSessionToken,
  verifySessionToken,
} from "@/lib/admin-auth";
import { isDemoMode } from "@/lib/artwork-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configErr = adminConfigError();
  if (configErr) {
    return NextResponse.json({
      authenticated: false,
      configured: false,
      message: configErr,
      demoMode: isDemoMode(),
    });
  }

  const cookieOk = verifySessionToken(readSessionToken(request));
  const authenticated = cookieOk || isAuthorizedAdmin(request);

  return NextResponse.json({
    authenticated: Boolean(cookieOk),
    configured: true,
    demoMode: isDemoMode(),
    // Bearer-only automation does not count as UI session
    bearerOk: authenticated && !cookieOk,
  });
}
