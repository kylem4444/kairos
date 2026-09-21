import { beforeEach, describe, expect, it } from "vitest";
import {
  demoClaimArtwork,
  demoListOpenSessions,
  demoLogCheckoutSession,
  demoResetArtwork,
  demoExpireSessions,
} from "./demo-store";

describe("demo checkout race", () => {
  beforeEach(() => {
    demoResetArtwork({
      status: "live",
      live_at: new Date().toISOString(),
    });
  });

  it("lets many sessions open without locking", () => {
    const a = demoLogCheckoutSession({
      stripe_session_id: "cs_a",
      artwork_id: "00000000-0000-4000-8000-000000000001",
      outcome: "purchase",
      amount_cents: 900_000_00,
    });
    const b = demoLogCheckoutSession({
      stripe_session_id: "cs_b",
      artwork_id: "00000000-0000-4000-8000-000000000001",
      outcome: "destroy",
      amount_cents: 900_000_00,
    });

    expect(a.status).toBe("open");
    expect(b.status).toBe("open");
    expect(
      demoListOpenSessions("00000000-0000-4000-8000-000000000001"),
    ).toHaveLength(2);
  });

  it("first claim wins and others can be expired", () => {
    demoLogCheckoutSession({
      stripe_session_id: "cs_a",
      artwork_id: "00000000-0000-4000-8000-000000000001",
      outcome: "purchase",
      amount_cents: 500_000_00,
    });
    demoLogCheckoutSession({
      stripe_session_id: "cs_b",
      artwork_id: "00000000-0000-4000-8000-000000000001",
      outcome: "purchase",
      amount_cents: 500_000_00,
    });

    const first = demoClaimArtwork({
      sessionId: "cs_a",
      outcome: "purchase",
      amountCents: 500_000_00,
    });
    expect(first.claimed?.status).toBe("purchased");
    expect(first.alreadySettled).toBe(false);

    const second = demoClaimArtwork({
      sessionId: "cs_b",
      outcome: "purchase",
      amountCents: 500_000_00,
    });
    expect(second.claimed).toBeNull();
    expect(second.alreadySettled).toBe(true);

    demoExpireSessions(["cs_b"]);
    const open = demoListOpenSessions(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(open.find((s) => s.stripe_session_id === "cs_b")).toBeUndefined();
  });
});
