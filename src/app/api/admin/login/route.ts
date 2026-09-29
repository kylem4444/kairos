import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  adminUnavailableResponse,
  checkLoginRateLimit,
  clearLoginFailures,
  createSessionToken,
  getClientIp,
  recordLoginFailure,
  setSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const configErr = adminConfigError();
  if (configErr) return adminUnavailableResponse();

  const ip = getClientIp(request);
  const limit = checkLoginRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many failed attempts. Try again later.",
        retryAfterSec: limit.retryAfterSec,
      },
      {
        status: 429,
        headers: limit.retryAfterSec
          ? { "Retry-After": String(limit.retryAfterSec) }
          : undefined,
      },
    );
  }

  try {
    const body = (await request.json()) as { password?: string };
    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "password required" },
        { status: 400 },
      );
    }

    if (!verifyAdminPassword(body.password)) {
      recordLoginFailure(ip);
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 },
      );
    }

    clearLoginFailures(ip);
    const token = createSessionToken();
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("POST /api/admin/login", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
