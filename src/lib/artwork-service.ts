import {
  demoClaimArtwork,
  demoExpireSessions,
  demoGetCurrentArtwork,
  demoGetSession,
  demoListOpenSessions,
  demoLogCheckoutSession,
  demoMarkAutoDestroyed,
  demoResetArtwork,
  demoSetLivestreamUrl,
} from "./demo-store";
import {
  computePriceCents,
  endsAt,
  formatUsdFromCents,
  isPastZero,
} from "./price";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  Artwork,
  ArtworkPublicView,
  CheckoutSessionRow,
  Outcome,
} from "./types";

export function isDemoMode(): boolean {
  return (
    process.env.USE_DEMO_STORE === "true" || !isSupabaseConfigured()
  );
}

export async function getCurrentArtwork(): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoGetCurrentArtwork();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .neq("status", "draft")
    .order("live_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Artwork | null;
}

export async function getArtworkPublicView(
  now: Date = new Date(),
): Promise<ArtworkPublicView | null> {
  let artwork = await getCurrentArtwork();
  if (!artwork) return null;

  // Auto-flip to auto_destroyed if the week elapsed while still live
  if (
    artwork.status === "live" &&
    isPastZero(artwork.live_at, artwork.duration_ms, now)
  ) {
    artwork = (await markAutoDestroyed(artwork.id)) ?? artwork;
  }

  const priceCents = computePriceCents({
    startPriceCents: artwork.start_price_cents,
    liveAt: artwork.live_at,
    durationMs: artwork.duration_ms,
    now,
  });

  return {
    artwork,
    priceCents: artwork.status === "live" ? priceCents : (artwork.settled_amount_cents ?? priceCents),
    priceFormatted: formatUsdFromCents(
      artwork.status === "live"
        ? priceCents
        : (artwork.settled_amount_cents ?? priceCents),
    ),
    endsAt: endsAt(artwork.live_at, artwork.duration_ms).toISOString(),
    demoMode: isDemoMode(),
  };
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

/**
 * First successful payment wins. Returns the claimed artwork, or null if
 * another payment already settled the piece.
 */
export async function claimArtwork(input: {
  artworkId: string;
  sessionId: string;
  outcome: Outcome;
  amountCents: number;
}): Promise<{ claimed: Artwork | null; alreadySettled: boolean }> {
  if (isDemoMode()) {
    return demoClaimArtwork({
      sessionId: input.sessionId,
      outcome: input.outcome,
      amountCents: input.amountCents,
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

    return { claimed: data as Artwork, alreadySettled: false };
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
    return demoMarkAutoDestroyed();
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
  return data as Artwork | null;
}

export async function setLivestreamUrl(
  artworkId: string,
  url: string,
): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoSetLivestreamUrl(url);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artworks")
    .update({ livestream_url: url })
    .eq("id", artworkId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as Artwork | null;
}

export async function goLive(artworkId: string): Promise<Artwork | null> {
  if (isDemoMode()) {
    return demoResetArtwork({
      status: "live",
      live_at: new Date().toISOString(),
      settled_outcome: null,
      settled_at: null,
      settled_amount_cents: null,
      winning_session_id: null,
    });
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
  return data as Artwork | null;
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
