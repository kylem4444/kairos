import { STATIC_ARTWORK_DESCRIPTION } from "./copy";
import {
  demoAppendDestroyedImages,
  demoAppendImages,
  demoClaimArtwork,
  demoCreateArtwork,
  demoDeleteArtwork,
  demoExpireSessions,
  demoGetArtwork,
  demoGetCurrentArtwork,
  demoGetSession,
  demoGoLive,
  demoHasLiveArtwork,
  demoListArchiveArtworks,
  demoListArtworks,
  demoListOpenSessions,
  demoLogCheckoutSession,
  demoMarkAutoDestroyed,
  demoResetArtwork,
  demoSetLivestreamUrl,
  demoUpdateArtwork,
} from "./demo-store";
import {
  computePriceCents,
  endsAt,
  formatUsdFromCents,
  isPastZero,
  START_PRICE_CENTS,
  WEEK_MS,
} from "./price";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  Artwork,
  ArtworkPublicView,
  CheckoutSessionRow,
  GalleryArtwork,
  Outcome,
} from "./types";
import {
  isDestroyedStatus,
  normalizeArtwork,
  publicArchiveImages,
} from "./types";

export function isDemoMode(): boolean {
  return (
    process.env.USE_DEMO_STORE === "true" || !isSupabaseConfigured()
  );
}

function asArtwork(row: Artwork | null): Artwork | null {
  return row ? normalizeArtwork(row) : null;
}

export async function getCurrentArtwork(): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoGetCurrentArtwork();
  }

  const supabase = getSupabaseAdmin();
  const { data: live, error: liveError } = await supabase
    .from("artworks")
    .select("*")
    .eq("status", "live")
    .order("live_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (liveError) throw liveError;
  if (live) return asArtwork(live as Artwork);

  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .neq("status", "draft")
    .order("live_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function getArtworkPublicView(
  now: Date = new Date(),
): Promise<ArtworkPublicView | null> {
  let artwork = await getCurrentArtwork();
  if (!artwork) return null;

  if (
    artwork.status === "live" &&
    artwork.live_at &&
    isPastZero(artwork.live_at, artwork.duration_ms, now)
  ) {
    artwork = (await markAutoDestroyed(artwork.id)) ?? artwork;
  }

  const priceCents = computePriceCents({
    startPriceCents: artwork.start_price_cents,
    liveAt: artwork.live_at ?? now,
    durationMs: artwork.duration_ms,
    now,
  });

  return {
    artwork,
    priceCents:
      artwork.status === "live"
        ? priceCents
        : (artwork.settled_amount_cents ?? priceCents),
    priceFormatted: formatUsdFromCents(
      artwork.status === "live"
        ? priceCents
        : (artwork.settled_amount_cents ?? priceCents),
    ),
    endsAt: endsAt(
      artwork.live_at ?? now,
      artwork.duration_ms,
    ).toISOString(),
    demoMode: isDemoMode(),
  };
}

export async function listArtworks(): Promise<Artwork[]> {
  if (isDemoMode()) {
    return demoListArtworks();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeArtwork(row as Artwork));
}

export async function getArtworkById(id: string): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoGetArtwork(id);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function createArtwork(input: {
  title: string;
  description?: string;
  image_url?: string;
  image_urls?: string[];
  start_price_cents?: number;
  duration_ms?: number;
}): Promise<Artwork> {
  if (isDemoMode()) {
    return demoCreateArtwork(input);
  }

  const urls =
    input.image_urls && input.image_urls.length > 0
      ? input.image_urls
      : input.image_url
        ? [input.image_url]
        : ["/artwork-placeholder.svg"];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .insert({
      title: input.title,
      description: input.description ?? STATIC_ARTWORK_DESCRIPTION,
      image_url: urls[0],
      image_urls: urls,
      destroyed_image_urls: [],
      is_test: false,
      start_price_cents: input.start_price_cents ?? START_PRICE_CENTS,
      duration_ms: input.duration_ms ?? WEEK_MS,
      status: "draft",
      live_at: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeArtwork(data as Artwork);
}

/** Deletes a draft artwork only. Live/settled pieces cannot be removed. */
export async function deleteArtwork(id: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoDeleteArtwork(id);
  }

  const existing = await getArtworkById(id);
  if (!existing || existing.status !== "draft") return false;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("artworks").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function updateArtwork(
  id: string,
  patch: {
    title?: string;
    description?: string;
    image_url?: string;
    image_urls?: string[];
    destroyed_image_urls?: string[];
    is_test?: boolean;
    start_price_cents?: number;
    duration_ms?: number;
    livestream_url?: string | null;
  },
): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoUpdateArtwork(id, patch);
  }

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.start_price_cents !== undefined) {
    updates.start_price_cents = patch.start_price_cents;
  }
  if (patch.duration_ms !== undefined) updates.duration_ms = patch.duration_ms;
  if (patch.livestream_url !== undefined) {
    updates.livestream_url = patch.livestream_url;
  }
  if (patch.is_test !== undefined) updates.is_test = patch.is_test;
  if (patch.destroyed_image_urls !== undefined) {
    updates.destroyed_image_urls = patch.destroyed_image_urls;
  }
  if (patch.image_urls !== undefined) {
    updates.image_urls = patch.image_urls;
    updates.image_url = patch.image_urls[0] ?? "/artwork-placeholder.svg";
  } else if (patch.image_url !== undefined) {
    updates.image_url = patch.image_url;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function appendArtworkImages(
  id: string,
  urls: string[],
): Promise<Artwork | null> {
  if (urls.length === 0) return getArtworkById(id);

  if (isDemoMode()) {
    return demoAppendImages(id, urls);
  }

  const existing = await getArtworkById(id);
  if (!existing) return null;
  const merged = [...existing.image_urls, ...urls];
  return updateArtwork(id, { image_urls: merged });
}

export async function appendDestroyedImages(
  id: string,
  urls: string[],
): Promise<Artwork | null> {
  if (urls.length === 0) return getArtworkById(id);

  if (isDemoMode()) {
    return demoAppendDestroyedImages(id, urls);
  }

  const existing = await getArtworkById(id);
  if (!existing) return null;
  const merged = [...existing.destroyed_image_urls, ...urls];
  return updateArtwork(id, { destroyed_image_urls: merged });
}

export async function listArchiveArtworks(): Promise<GalleryArtwork[]> {
  const rows = isDemoMode()
    ? demoListArchiveArtworks()
    : await (async () => {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("artworks")
          .select("*")
          .eq("is_test", false)
          .in("status", ["purchased", "destroyed", "auto_destroyed"])
          .order("settled_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => normalizeArtwork(row as Artwork));
      })();

  return rows.map((artwork) => ({
    id: artwork.id,
    title: artwork.title,
    description: artwork.description ?? "",
    status: artwork.status,
    images: publicArchiveImages(artwork),
    isDestroyed: isDestroyedStatus(artwork.status),
  }));
}

export async function hasLiveArtwork(excludeId?: string): Promise<boolean> {
  if (isDemoMode()) {
    return demoHasLiveArtwork(excludeId);
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("status", "live");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function logCheckoutSession(input: {
  stripe_session_id: string;
  artwork_id: string;
  outcome: Outcome;
  amount_cents: number;
}): Promise<CheckoutSessionRow> {
  if (isDemoMode()) {
    return demoLogCheckoutSession(input);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      stripe_session_id: input.stripe_session_id,
      artwork_id: input.artwork_id,
      outcome: input.outcome,
      amount_cents: input.amount_cents,
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CheckoutSessionRow;
}

export async function claimArtwork(input: {
  artworkId: string;
  sessionId: string;
  outcome: Outcome;
  amountCents: number;
  isTest?: boolean;
}): Promise<{ claimed: Artwork | null; alreadySettled: boolean }> {
  if (isDemoMode()) {
    return demoClaimArtwork({
      sessionId: input.sessionId,
      outcome: input.outcome,
      amountCents: input.amountCents,
      isTest: input.isTest ?? true,
    });
  }

  const supabase = getSupabaseAdmin();
  const nextStatus = input.outcome === "purchase" ? "purchased" : "destroyed";

  const { data, error } = await supabase
    .from("artworks")
    .update({
      status: nextStatus,
      settled_outcome: input.outcome,
      settled_at: new Date().toISOString(),
      settled_amount_cents: input.amountCents,
      winning_session_id: input.sessionId,
      is_test: Boolean(input.isTest),
    })
    .eq("id", input.artworkId)
    .eq("status", "live")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  if (data) {
    await supabase
      .from("checkout_sessions")
      .update({ status: "completed" })
      .eq("stripe_session_id", input.sessionId);

    return {
      claimed: normalizeArtwork(data as Artwork),
      alreadySettled: false,
    };
  }

  return { claimed: null, alreadySettled: true };
}

export async function listOpenSessions(
  artworkId: string,
): Promise<CheckoutSessionRow[]> {
  if (isDemoMode()) {
    return demoListOpenSessions(artworkId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("artwork_id", artworkId)
    .eq("status", "open");

  if (error) throw error;
  return (data ?? []) as CheckoutSessionRow[];
}

export async function markSessionsExpired(
  sessionIds: string[],
): Promise<void> {
  if (sessionIds.length === 0) return;

  if (isDemoMode()) {
    demoExpireSessions(sessionIds);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("checkout_sessions")
    .update({ status: "expired" })
    .in("stripe_session_id", sessionIds);

  if (error) throw error;
}

export async function getCheckoutSession(
  stripeSessionId: string,
): Promise<CheckoutSessionRow | null> {
  if (isDemoMode()) {
    return demoGetSession(stripeSessionId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (error) throw error;
  return data as CheckoutSessionRow | null;
}

export async function markAutoDestroyed(
  artworkId: string,
): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoMarkAutoDestroyed(artworkId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .update({
      status: "auto_destroyed",
      settled_at: new Date().toISOString(),
      settled_amount_cents: 0,
    })
    .eq("id", artworkId)
    .eq("status", "live")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function setLivestreamUrl(
  artworkId: string,
  url: string,
): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoSetLivestreamUrl(url, artworkId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .update({ livestream_url: url })
    .eq("id", artworkId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function goLive(artworkId: string): Promise<Artwork | null> {
  if (await hasLiveArtwork(artworkId)) {
    throw new Error("Another artwork is already live");
  }

  if (isDemoMode()) {
    return demoGoLive(artworkId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .update({
      status: "live",
      live_at: new Date().toISOString(),
      settled_outcome: null,
      settled_at: null,
      settled_amount_cents: null,
      winning_session_id: null,
    })
    .eq("id", artworkId)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return asArtwork(data as Artwork | null);
}

export async function resetDemoArtwork(): Promise<Artwork> {
  if (!isDemoMode()) {
    throw new Error("resetDemoArtwork only works in demo mode");
  }
  return demoResetArtwork({
    live_at: new Date().toISOString(),
    status: "live",
  });
}

export async function uploadArtworkImage(file: {
  buffer: Buffer;
  contentType: string;
  filename: string;
}): Promise<string> {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);
  if (!allowed.has(file.contentType)) {
    throw new Error("Unsupported image type");
  }
  if (file.buffer.length > 10 * 1024 * 1024) {
    throw new Error("Image too large (max 10MB)");
  }

  if (isDemoMode()) {
    // Persist as data URL so demo mode works without Storage
    const b64 = file.buffer.toString("base64");
    return `data:${file.contentType};base64,${b64}`;
  }

  const ext =
    file.contentType === "image/png"
      ? "png"
      : file.contentType === "image/webp"
        ? "webp"
        : file.contentType === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from("artwork")
    .upload(path, file.buffer, {
      contentType: file.contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("artwork").getPublicUrl(path);
  return data.publicUrl;
}
