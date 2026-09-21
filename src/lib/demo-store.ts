import { START_PRICE_CENTS, WEEK_MS } from "./price";
import type { Artwork, CheckoutSessionRow, Outcome } from "./types";

/**
 * In-memory store for local development when Supabase is not configured.
 * Resets when the Node process restarts — fine for `npm run dev`.
 */
const DEMO_ARTWORK_ID = "00000000-0000-4000-8000-000000000001";

let artwork: Artwork = createFreshDemoArtwork();
const sessions = new Map<string, CheckoutSessionRow>();

function createFreshDemoArtwork(): Artwork {
  const liveAt =
    process.env.DEMO_LIVE_AT ??
    new Date(Date.now() - 60 * 60 * 1000).toISOString(); // started 1 hour ago

  return {
    id: DEMO_ARTWORK_ID,
    image_url: "/artwork/kairos-1-full.png",
    title: "Untitled No. 1",
    description:
      "One work. One week. The price falls from one million dollars to zero. Purchase it, or destroy it, for whatever the clock shows. If nobody acts, it is destroyed on livestream when the price hits zero.",
    start_price_cents: START_PRICE_CENTS,
    live_at: liveAt,
    duration_ms: WEEK_MS,
    status: "live",
    settled_outcome: null,
    settled_at: null,
    settled_amount_cents: null,
    winning_session_id: null,
    livestream_url: null,
  };
}

export function demoGetCurrentArtwork(): Artwork | null {
  if (artwork.status === "draft") return null;
  return structuredClone(artwork);
}

export function demoResetArtwork(overrides?: Partial<Artwork>): Artwork {
  artwork = { ...createFreshDemoArtwork(), ...overrides };
  sessions.clear();
  return structuredClone(artwork);
}

export function demoSetLivestreamUrl(url: string): Artwork {
  artwork = { ...artwork, livestream_url: url };
  return structuredClone(artwork);
}

export function demoMarkAutoDestroyed(): Artwork | null {
  if (artwork.status !== "live") return null;
  artwork = {
    ...artwork,
    status: "auto_destroyed",
    settled_at: new Date().toISOString(),
    settled_outcome: null,
    settled_amount_cents: 0,
  };
  return structuredClone(artwork);
}

export function demoLogCheckoutSession(input: {
  stripe_session_id: string;
  artwork_id: string;
  outcome: Outcome;
  amount_cents: number;
}): CheckoutSessionRow {
  const row: CheckoutSessionRow = {
    id: crypto.randomUUID(),
    stripe_session_id: input.stripe_session_id,
    artwork_id: input.artwork_id,
    outcome: input.outcome,
    amount_cents: input.amount_cents,
    status: "open",
    created_at: new Date().toISOString(),
  };
  sessions.set(row.stripe_session_id, row);
  return structuredClone(row);
}

/** Atomic claim: only succeeds if still live. Returns claimed artwork or null. */
export function demoClaimArtwork(input: {
  sessionId: string;
  outcome: Outcome;
  amountCents: number;
}): { claimed: Artwork | null; alreadySettled: boolean } {
  if (artwork.status !== "live") {
    return { claimed: null, alreadySettled: true };
  }

  artwork = {
    ...artwork,
    status: input.outcome === "purchase" ? "purchased" : "destroyed",
    settled_outcome: input.outcome,
    settled_at: new Date().toISOString(),
    settled_amount_cents: input.amountCents,
    winning_session_id: input.sessionId,
  };

  const winner = sessions.get(input.sessionId);
  if (winner) {
    sessions.set(input.sessionId, { ...winner, status: "completed" });
  }

  return { claimed: structuredClone(artwork), alreadySettled: false };
}

export function demoListOpenSessions(artworkId: string): CheckoutSessionRow[] {
  return [...sessions.values()]
    .filter((s) => s.artwork_id === artworkId && s.status === "open")
    .map((s) => structuredClone(s));
}

export function demoExpireSessions(sessionIds: string[]): void {
  for (const id of sessionIds) {
    const row = sessions.get(id);
    if (row && row.status === "open") {
      sessions.set(id, { ...row, status: "expired" });
    }
  }
}

export function demoGetSession(
  stripeSessionId: string,
): CheckoutSessionRow | null {
  const row = sessions.get(stripeSessionId);
  return row ? structuredClone(row) : null;
}
