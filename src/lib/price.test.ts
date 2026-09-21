import { describe, expect, it } from "vitest";
import {
  START_PRICE_CENTS,
  WEEK_MS,
  computePriceCents,
  formatUsdFromCents,
  isPastZero,
} from "./price";

describe("computePriceCents", () => {
  const liveAt = new Date("2026-01-01T00:00:00.000Z");

  it("starts at full price at liveAt", () => {
    expect(
      computePriceCents({
        startPriceCents: START_PRICE_CENTS,
        liveAt,
        durationMs: WEEK_MS,
        now: liveAt,
      }),
    ).toBe(START_PRICE_CENTS);
  });

  it("is halfway after 3.5 days", () => {
    const now = new Date(liveAt.getTime() + WEEK_MS / 2);
    expect(
      computePriceCents({
        startPriceCents: START_PRICE_CENTS,
        liveAt,
        durationMs: WEEK_MS,
        now,
      }),
    ).toBe(START_PRICE_CENTS / 2);
  });

  it("hits zero at and after one week", () => {
    const end = new Date(liveAt.getTime() + WEEK_MS);
    expect(
      computePriceCents({
        startPriceCents: START_PRICE_CENTS,
        liveAt,
        durationMs: WEEK_MS,
        now: end,
      }),
    ).toBe(0);

    expect(
      computePriceCents({
        startPriceCents: START_PRICE_CENTS,
        liveAt,
        durationMs: WEEK_MS,
        now: end.getTime() + 60_000,
      }),
    ).toBe(0);
  });

  it("isPastZero is true only after the full duration", () => {
    expect(isPastZero(liveAt, WEEK_MS, liveAt.getTime() + WEEK_MS - 1)).toBe(
      false,
    );
    expect(isPastZero(liveAt, WEEK_MS, liveAt.getTime() + WEEK_MS)).toBe(true);
  });
});

describe("formatUsdFromCents", () => {
  it("formats millions", () => {
    expect(formatUsdFromCents(100_000_000)).toBe("$1,000,000.00");
  });
});
