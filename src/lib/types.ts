export type ArtworkStatus =
  | "draft"
  | "live"
  | "purchased"
  | "destroyed"
  | "auto_destroyed";

export type Outcome = "purchase" | "destroy";

export type CheckoutSessionStatus = "open" | "completed" | "expired";

export type AnalyticsEventName =
  | "page_view"
  | "checkout_open"
  | "payment_succeeded";

export interface Artwork {
  id: string;
  title: string;
  description: string;
  image_url: string;
  image_urls: string[];
  /** Photos of the destroyed piece (shown in public gallery instead of originals). */
  destroyed_image_urls: string[];
  /** Test / Stripe test-mode sales — excluded from lifetime revenue + public gallery. */
  is_test: boolean;
  start_price_cents: number;
  live_at: string | null;
  duration_ms: number;
  status: ArtworkStatus;
  settled_outcome: Outcome | null;
  settled_at: string | null;
  settled_amount_cents: number | null;
  winning_session_id: string | null;
  livestream_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GalleryArtwork {
  id: string;
  title: string;
  description: string;
  status: ArtworkStatus;
  /** Images to show publicly (destroyed photos when destroyed; else originals). */
  images: string[];
  isDestroyed: boolean;
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

export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  artwork_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface AdminAnalytics {
  lifetimeRevenueCents: number;
  completedSales: number;
  pageViews: { all: number; last7d: number; last30d: number };
  checkoutOpens: { all: number; last7d: number; last30d: number };
  paymentSucceeded: { all: number; last7d: number; last30d: number };
  /** True when is_test column is missing — run gallery_migration.sql */
  migrationNeeded?: boolean;
}

/** Normalize DB/demo rows so gallery always has a usable list. */
export function normalizeArtwork(row: Artwork): Artwork {
  const urls =
    Array.isArray(row.image_urls) && row.image_urls.length > 0
      ? row.image_urls.filter(Boolean)
      : row.image_url
        ? [row.image_url]
        : [];
  const destroyed = Array.isArray(row.destroyed_image_urls)
    ? row.destroyed_image_urls.filter(Boolean)
    : [];
  return {
    ...row,
    image_urls: urls,
    image_url: urls[0] ?? row.image_url ?? "/artwork-placeholder.svg",
    destroyed_image_urls: destroyed,
    is_test: Boolean(row.is_test),
  };
}

export function galleryUrls(artwork: Artwork): string[] {
  const normalized = normalizeArtwork(artwork);
  return normalized.image_urls.length > 0
    ? normalized.image_urls
    : [normalized.image_url];
}

/** Put `primaryUrl` first; used as the homepage hero (`image_url` / index 0). */
export function withPrimaryImage(urls: string[], primaryUrl: string): string[] {
  if (!urls.includes(primaryUrl)) return urls;
  return [primaryUrl, ...urls.filter((url) => url !== primaryUrl)];
}

export function isDestroyedStatus(status: ArtworkStatus): boolean {
  return status === "destroyed" || status === "auto_destroyed";
}

/** Public archive images: destroyed pieces only show post-destruction photos. */
export function publicArchiveImages(artwork: Artwork): string[] {
  const normalized = normalizeArtwork(artwork);
  if (isDestroyedStatus(normalized.status)) {
    return normalized.destroyed_image_urls;
  }
  return galleryUrls(normalized);
}
