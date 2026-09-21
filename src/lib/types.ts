export type ArtworkStatus =
  | "draft"
  | "live"
  | "purchased"
  | "destroyed"
  | "auto_destroyed";

export type Outcome = "purchase" | "destroy";

export type CheckoutSessionStatus = "open" | "completed" | "expired";

export interface Artwork {
  id: string;
  title: string;
  description: string;
  image_url: string;
  start_price_cents: number;
  live_at: string;
  duration_ms: number;
  status: ArtworkStatus;
  settled_outcome: Outcome | null;
  settled_at: string | null;
  settled_amount_cents: number | null;
  winning_session_id: string | null;
  livestream_url: string | null;
}

export interface CheckoutSessionRow {
  id: string;
  stripe_session_id: string;
  artwork_id: string;
  outcome: Outcome;
  amount_cents: number;
  status: CheckoutSessionStatus;
  created_at: string;
}

export interface ArtworkPublicView {
  artwork: Artwork;
  priceCents: number;
  priceFormatted: string;
  endsAt: string;
  demoMode: boolean;
}
