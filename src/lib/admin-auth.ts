import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "kairos_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_FAILURES = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

type Attempt = { count: number; lockedUntil: number };
const loginAttempts = new Map<string, Attempt>();

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET && process.env.ADMIN_PASSWORD);
}

export function adminConfigError(): string | null {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.ADMIN_SECRET || !process.env.ADMIN_PASSWORD) {
      return "Admin is not configured (ADMIN_SECRET and ADMIN_PASSWORD required).";
    }
  }
  return null;
}

function getSigningSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_SECRET is required");
    }
    return "dev-only-admin-secret";
  }
  return secret;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD is required");
    }
    return "dev-admin";
  }
  return password;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still do a compare to reduce timing leakage on length
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export function verifyAdminPassword(password: string): boolean {
  return safeEqual(password, getAdminPassword());
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expStr, sig] = parts;
  if (version !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${version}.${expStr}`;
  const expected = signPayload(payload);
  return safeEqual(sig, expected);
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkLoginRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { allowed: true };
  if (attempt.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((attempt.lockedUntil - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > now) return;
  attempt.count += 1;
  if (attempt.count >= MAX_FAILURES) {
    attempt.lockedUntil = now + LOCKOUT_MS;
    attempt.count = 0;
  }
  loginAttempts.set(ip, attempt);
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(ADMIN_COOKIE)?.value;
}

export function isAuthorizedAdmin(request: NextRequest): boolean {
  const configErr = adminConfigError();
  if (configErr) return false;

  // Cookie session
  if (verifySessionToken(readSessionToken(request))) return true;

  // Bearer automation (ADMIN_SECRET)
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // Dev convenience when secrets unset
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function adminUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "admin_unconfigured",
      message: adminConfigError() ?? "Admin is not configured.",
    },
    { status: 503 },
  );
}
