/** One week in milliseconds — locked decay window. */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const START_PRICE_CENTS = 100_000_000; // $1,000,000.00

/**
 * Linear decay from startPriceCents → $0 over durationMs.
 * Authoritative formula used by both the UI ticker and checkout.
 */
export function computePriceCents(params: {
  startPriceCents: number;
  liveAt: Date | string | number;
  durationMs: number;
  now?: Date | string | number;
}): number {
  const liveAtMs = toMs(params.liveAt);
  const nowMs = toMs(params.now ?? Date.now());
  const durationMs = params.durationMs;

  if (durationMs <= 0) return 0;
  if (nowMs <= liveAtMs) return Math.max(0, Math.round(params.startPriceCents));

  const elapsed = nowMs - liveAtMs;
  if (elapsed >= durationMs) return 0;

  const remaining = 1 - elapsed / durationMs;
  return Math.max(0, Math.round(params.startPriceCents * remaining));
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function endsAt(liveAt: Date | string | number, durationMs: number): Date {
  return new Date(toMs(liveAt) + durationMs);
}

export function isPastZero(
  liveAt: Date | string | number,
  durationMs: number,
  now: Date | string | number = Date.now(),
): boolean {
  return computePriceCents({
    startPriceCents: 1,
    liveAt,
    durationMs,
    now,
  }) === 0 && toMs(now) >= toMs(liveAt) + durationMs;
}

function toMs(value: Date | string | number): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}
