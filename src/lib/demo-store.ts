import { START_PRICE_CENTS, WEEK_MS } from "./price";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  Artwork,
  CheckoutSessionRow,
  Outcome,
} from "./types";
import { normalizeArtwork } from "./types";

/**
 * In-memory store for local development when Supabase is not configured.
 * Resets when the Node process restarts — fine for `npm run dev`.
 */
const DEMO_ARTWORK_ID = "00000000-0000-4000-8000-000000000001";

const artworks = new Map<string, Artwork>();
const sessions = new Map<string, CheckoutSessionRow>();
const analyticsEvents: AnalyticsEvent[] = [];

function createFreshDemoArtwork(): Artwork {
  const liveAt =
    process.env.DEMO_LIVE_AT ??
    new Date(Date.now() - 60 * 60 * 1000).toISOString();

  return normalizeArtwork({
    id: DEMO_ARTWORK_ID,
    image_url: "/artwork/kairos-1-full.png",
    image_urls: [
      "/artwork/kairos-1-full.png",
      "/artwork/kairos-1-detail.png",
    ],
    destroyed_image_urls: [],
    is_test: true,
    title: "Untitled No. 1",
    description: "",
    start_price_cents: START_PRICE_CENTS,
    live_at: liveAt,
    duration_ms: WEEK_MS,
    status: "live",
    settled_outcome: null,
    settled_at: null,
    settled_amount_cents: null,
    winning_session_id: null,
    livestream_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

function ensureSeeded() {
  if (artworks.size === 0) {
    const fresh = createFreshDemoArtwork();
    artworks.set(fresh.id, fresh);
  }
}

ensureSeeded();

export function demoGetCurrentArtwork(): Artwork | null {
  ensureSeeded();
  const live = [...artworks.values()].find((a) => a.status === "live");
  if (live) return structuredClone(normalizeArtwork(live));

  const settled = [...artworks.values()]
    .filter((a) => a.status !== "draft")
    .sort((a, b) => {
      const aT = a.live_at ? new Date(a.live_at).getTime() : 0;
      const bT = b.live_at ? new Date(b.live_at).getTime() : 0;
      return bT - aT;
    })[0];

  return settled ? structuredClone(normalizeArtwork(settled)) : null;
}

export function demoListArtworks(): Artwork[] {
  ensureSeeded();
  return [...artworks.values()]
    .map((a) => structuredClone(normalizeArtwork(a)))
    .sort((a, b) => {
      const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bT - aT;
    });
}

export function demoGetArtwork(id: string): Artwork | null {
  ensureSeeded();
  const row = artworks.get(id);
  return row ? structuredClone(normalizeArtwork(row)) : null;
}

export function demoCreateArtwork(input: {
  title: string;
  description?: string;
  image_url?: string;
  image_urls?: string[];
  start_price_cents?: number;
  duration_ms?: number;
}): Artwork {
  ensureSeeded();
  const urls =
    input.image_urls && input.image_urls.length > 0
      ? input.image_urls
      : input.image_url
        ? [input.image_url]
        : ["/artwork-placeholder.svg"];
  const now = new Date().toISOString();
  const row = normalizeArtwork({
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? "",
    image_url: urls[0]!,
    image_urls: urls,
    destroyed_image_urls: [],
    is_test: false,
    start_price_cents: input.start_price_cents ?? START_PRICE_CENTS,
    live_at: null,
    duration_ms: input.duration_ms ?? WEEK_MS,
    status: "draft",
    settled_outcome: null,
    settled_at: null,
    settled_amount_cents: null,
    winning_session_id: null,
    livestream_url: null,
    created_at: now,
    updated_at: now,
  });
  artworks.set(row.id, row);
  return structuredClone(row);
}

export function demoUpdateArtwork(
  id: string,
  patch: Partial<
    Pick<
      Artwork,
      | "title"
      | "description"
      | "image_url"
      | "image_urls"
      | "start_price_cents"
      | "duration_ms"
      | "livestream_url"
      | "status"
      | "live_at"
      | "settled_outcome"
      | "settled_at"
      | "settled_amount_cents"
      | "winning_session_id"
      | "is_test"
      | "destroyed_image_urls"
    >
  >,
): Artwork | null {
  ensureSeeded();
  const existing = artworks.get(id);
  if (!existing) return null;

  const merged: Artwork = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  if (patch.image_urls) {
    merged.image_urls = patch.image_urls;
    merged.image_url = patch.image_urls[0] ?? existing.image_url;
  } else if (patch.image_url) {
    merged.image_url = patch.image_url;
    if (!merged.image_urls?.length) merged.image_urls = [patch.image_url];
  }
  const next = normalizeArtwork(merged);
  artworks.set(id, next);
  return structuredClone(next);
}

export function demoGoLive(artworkId: string): Artwork | null {
  ensureSeeded();
  const target = artworks.get(artworkId);
  if (!target || target.status !== "draft") return null;

  const anotherLive = [...artworks.values()].find(
    (a) => a.status === "live" && a.id !== artworkId,
  );
  if (anotherLive) {
    throw new Error("Another artwork is already live");
  }

  const updated = normalizeArtwork({
    ...target,
    status: "live",
    live_at: new Date().toISOString(),
    settled_outcome: null,
    settled_at: null,
    settled_amount_cents: null,
    winning_session_id: null,
    updated_at: new Date().toISOString(),
  });
  artworks.set(artworkId, updated);
  return structuredClone(updated);
}

export function demoHasLiveArtwork(excludeId?: string): boolean {
  ensureSeeded();
  return [...artworks.values()].some(
    (a) => a.status === "live" && a.id !== excludeId,
  );
}

export function demoLifetimeRevenueCents(): number {
  ensureSeeded();
  return [...artworks.values()]
    .filter(
      (a) =>
        !a.is_test &&
        (a.status === "purchased" || a.status === "destroyed"),
    )
    .reduce((sum, a) => sum + (a.settled_amount_cents ?? 0), 0);
}

export function demoCompletedSalesCount(): number {
  ensureSeeded();
  return [...artworks.values()].filter(
    (a) =>
      !a.is_test &&
      (a.status === "purchased" || a.status === "destroyed"),
  ).length;
}

export function demoListArchiveArtworks(): Artwork[] {
  ensureSeeded();
  return [...artworks.values()]
    .filter(
      (a) =>
        !a.is_test &&
        (a.status === "purchased" ||
          a.status === "destroyed" ||
          a.status === "auto_destroyed"),
    )
    .map((a) => structuredClone(normalizeArtwork(a)))
    .sort((a, b) => {
      const aT = a.settled_at ? new Date(a.settled_at).getTime() : 0;
      const bT = b.settled_at ? new Date(b.settled_at).getTime() : 0;
      return bT - aT;
    });
}

export function demoTrackEvent(input: {
  name: AnalyticsEventName;
  artwork_id?: string | null;
  meta?: Record<string, unknown>;
}): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: crypto.randomUUID(),
    name: input.name,
    artwork_id: input.artwork_id ?? null,
    meta: input.meta ?? {},
    created_at: new Date().toISOString(),
  };
  analyticsEvents.push(event);
  return structuredClone(event);
}

export function demoCountEvents(
  name: AnalyticsEventName,
  sinceMs?: number,
): number {
  const since = sinceMs ?? 0;
  return analyticsEvents.filter((e) => {
    if (e.name !== name) return false;
    return new Date(e.created_at).getTime() >= since;
  }).length;
}

/** Reset primary demo artwork (tests + admin reset-demo). */
export function demoResetArtwork(overrides?: Partial<Artwork>): Artwork {
  sessions.clear();
  analyticsEvents.length = 0;
  artworks.clear();
  const fresh = normalizeArtwork({
    ...createFreshDemoArtwork(),
    ...overrides,
    image_urls:
      overrides?.image_urls ??
      createFreshDemoArtwork().image_urls,
  });
  artworks.set(fresh.id, fresh);
  return structuredClone(fresh);
}

export function demoSetLivestreamUrl(url: string, artworkId?: string): Artwork {
  ensureSeeded();
  const id = artworkId ?? demoGetCurrentArtwork()?.id;
  if (!id) throw new Error("No artwork");
  const updated = demoUpdateArtwork(id, { livestream_url: url });
  if (!updated) throw new Error("Artwork not found");
  return updated;
}

export function demoMarkAutoDestroyed(artworkId?: string): Artwork | null {
  ensureSeeded();
  const current = artworkId
    ? artworks.get(artworkId)
    : [...artworks.values()].find((a) => a.status === "live");
  if (!current || current.status !== "live") return null;
  const updated = normalizeArtwork({
    ...current,
    status: "auto_destroyed",
    settled_at: new Date().toISOString(),
    settled_outcome: null,
    settled_amount_cents: 0,
    updated_at: new Date().toISOString(),
  });
  artworks.set(current.id, updated);
  return structuredClone(updated);
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

export function demoClaimArtwork(input: {
  sessionId: string;
  outcome: Outcome;
  amountCents: number;
  isTest?: boolean;
}): { claimed: Artwork | null; alreadySettled: boolean } {
  ensureSeeded();
  const live = [...artworks.values()].find((a) => a.status === "live");
  if (!live) {
    return { claimed: null, alreadySettled: true };
  }

  const updated = normalizeArtwork({
    ...live,
    status: input.outcome === "purchase" ? "purchased" : "destroyed",
    settled_outcome: input.outcome,
    settled_at: new Date().toISOString(),
    settled_amount_cents: input.amountCents,
    winning_session_id: input.sessionId,
    is_test: input.isTest ?? true,
    updated_at: new Date().toISOString(),
  });
  artworks.set(live.id, updated);

  const winner = sessions.get(input.sessionId);
  if (winner) {
    sessions.set(input.sessionId, { ...winner, status: "completed" });
  }

  return { claimed: structuredClone(updated), alreadySettled: false };
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

export function demoAppendImages(
  artworkId: string,
  urls: string[],
): Artwork | null {
  const existing = artworks.get(artworkId);
  if (!existing) return null;
  const merged = [...(existing.image_urls ?? []), ...urls];
  return demoUpdateArtwork(artworkId, {
    image_urls: merged,
    image_url: merged[0],
  });
}

export function demoAppendDestroyedImages(
  artworkId: string,
  urls: string[],
): Artwork | null {
  const existing = artworks.get(artworkId);
  if (!existing) return null;
  const merged = [...(existing.destroyed_image_urls ?? []), ...urls];
  return demoUpdateArtwork(artworkId, { destroyed_image_urls: merged });
}

/** Only drafts can be deleted. */
export function demoDeleteArtwork(id: string): boolean {
  ensureSeeded();
  const existing = artworks.get(id);
  if (!existing || existing.status !== "draft") return false;
  artworks.delete(id);
  return true;
}
