import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigError,
  verifySessionToken,
} from "@/lib/admin-auth";

/**
 * Protect admin APIs. The /dashboard HTML page always loads (shows login).
 * Login / logout / session endpoints stay public.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminApi = pathname.startsWith("/api/admin");
  if (!isAdminApi) {
    return NextResponse.next();
  }

  const publicAdminPaths = new Set([
    "/api/admin/login",
    "/api/admin/logout",
    "/api/admin/session",
  ]);

  if (publicAdminPaths.has(pathname)) {
    return NextResponse.next();
  }

  const configErr = adminConfigError();
  if (configErr) {
    return NextResponse.json(
      { error: "admin_unconfigured", message: configErr },
      { status: 503 },
    );
  }

  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (verifySessionToken(cookie)) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) {
    return NextResponse.next();
  }

  // Local dev without secrets: allow (matches API authorize helpers)
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.ADMIN_SECRET &&
    !process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
