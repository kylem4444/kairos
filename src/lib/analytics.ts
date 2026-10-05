import {
  demoCompletedSalesCount,
  demoCountEvents,
  demoLifetimeRevenueCents,
  demoListEventMetas,
  demoTrackEvent,
} from "./demo-store";
import {
  aggregateGeoFromMetas,
  emptyGeoMetric,
  type GeoMetricAggregate,
} from "./geo";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  AdminAnalytics,
  AnalyticsEventName,
} from "./types";

export type AdminAnalyticsGeo = {
  pageViews: GeoMetricAggregate;
  checkoutOpens: GeoMetricAggregate;
};

function analyticsDemoMode(): boolean {
  return (
    process.env.USE_DEMO_STORE === "true" || !isSupabaseConfigured()
  );
}

const ALLOWED: ReadonlySet<AnalyticsEventName> = new Set([
  "page_view",
  "checkout_open",
  "payment_succeeded",
]);

export function isAllowedEventName(
  name: string,
): name is AnalyticsEventName {
  return ALLOWED.has(name as AnalyticsEventName);
}

export async function trackAnalyticsEvent(input: {
  name: AnalyticsEventName;
  artwork_id?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (!isAllowedEventName(input.name)) return;

  if (analyticsDemoMode()) {
    demoTrackEvent(input);
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("analytics_events").insert({
    name: input.name,
    artwork_id: input.artwork_id ?? null,
    meta: input.meta ?? {},
  });
  if (error) {
    console.error("trackAnalyticsEvent", error);
  }
}

async function countEventsSince(
  name: AnalyticsEventName,
  sinceIso: string | null,
): Promise<number> {
  if (analyticsDemoMode()) {
    const sinceMs = sinceIso ? new Date(sinceIso).getTime() : 0;
    return demoCountEvents(name, sinceMs);
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("name", name);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (analyticsDemoMode()) {
    return {
      lifetimeRevenueCents: demoLifetimeRevenueCents(),
      completedSales: demoCompletedSalesCount(),
      pageViews: {
        all: demoCountEvents("page_view"),
        last7d: demoCountEvents("page_view", new Date(d7).getTime()),
        last30d: demoCountEvents("page_view", new Date(d30).getTime()),
      },
      checkoutOpens: {
        all: demoCountEvents("checkout_open"),
        last7d: demoCountEvents("checkout_open", new Date(d7).getTime()),
        last30d: demoCountEvents("checkout_open", new Date(d30).getTime()),
      },
      paymentSucceeded: {
        all: demoCountEvents("payment_succeeded"),
        last7d: demoCountEvents(
          "payment_succeeded",
          new Date(d7).getTime(),
        ),
        last30d: demoCountEvents(
          "payment_succeeded",
          new Date(d30).getTime(),
        ),
      },
    };
  }

  const supabase = getSupabaseAdmin();
  // Lifetime revenue: real settled sales only (exclude Stripe test / marked tests)
  let settled:
    | { settled_amount_cents: number | null; status: string }[]
    | null = null;
  let migrationNeeded = false;

  const withTestFilter = await supabase
    .from("artworks")
    .select("settled_amount_cents, status")
    .eq("is_test", false)
    .in("status", ["purchased", "destroyed"]);

  if (withTestFilter.error) {
    // Column missing until gallery_migration.sql is applied
    console.warn(
      "analytics is_test filter failed; falling back",
      withTestFilter.error.message,
    );
    migrationNeeded = true;
    const fallback = await supabase
      .from("artworks")
      .select("settled_amount_cents, status")
      .in("status", ["purchased", "destroyed"]);
    if (fallback.error) throw fallback.error;
    settled = fallback.data;
  } else {
    settled = withTestFilter.data;
  }

  const lifetimeRevenueCents = (settled ?? []).reduce(
    (sum, row) => sum + (row.settled_amount_cents ?? 0),
    0,
  );
  const completedSales = settled?.length ?? 0;

  const [
    pageAll,
    page7,
    page30,
    checkoutAll,
    checkout7,
    checkout30,
    payAll,
    pay7,
    pay30,
  ] = await Promise.all([
    countEventsSince("page_view", null),
    countEventsSince("page_view", d7),
    countEventsSince("page_view", d30),
    countEventsSince("checkout_open", null),
    countEventsSince("checkout_open", d7),
    countEventsSince("checkout_open", d30),
    countEventsSince("payment_succeeded", null),
    countEventsSince("payment_succeeded", d7),
    countEventsSince("payment_succeeded", d30),
  ]);

  return {
    lifetimeRevenueCents,
    completedSales,
    pageViews: { all: pageAll, last7d: page7, last30d: page30 },
    checkoutOpens: { all: checkoutAll, last7d: checkout7, last30d: checkout30 },
    paymentSucceeded: { all: payAll, last7d: pay7, last30d: pay30 },
    migrationNeeded,
  };
}

async function listEventMetas(
  name: "page_view" | "checkout_open",
): Promise<Array<Record<string, unknown>>> {
  if (analyticsDemoMode()) {
    return demoListEventMetas(name);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("meta")
    .eq("name", name)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;
  return (data ?? []).map((row) =>
    row.meta && typeof row.meta === "object"
      ? (row.meta as Record<string, unknown>)
      : {},
  );
}

export async function getAnalyticsGeo(): Promise<AdminAnalyticsGeo> {
  if (analyticsDemoMode()) {
    // Seed a few sample points so the map is usable in local demo.
    if (demoListEventMetas("page_view").length === 0) {
      demoTrackEvent({
        name: "page_view",
        meta: { country: "US", region: "CO" },
      });
      demoTrackEvent({
        name: "page_view",
        meta: { country: "US", region: "NY" },
      });
      demoTrackEvent({
        name: "page_view",
        meta: { country: "GB" },
      });
      demoTrackEvent({
        name: "checkout_open",
        meta: { country: "US", region: "CO" },
      });
      demoTrackEvent({
        name: "checkout_open",
        meta: { country: "DE" },
      });
    }
  }

  const [pageMetas, checkoutMetas] = await Promise.all([
    listEventMetas("page_view"),
    listEventMetas("checkout_open"),
  ]);

  return {
    pageViews: aggregateGeoFromMetas(pageMetas),
    checkoutOpens: aggregateGeoFromMetas(checkoutMetas),
  };
}

export { emptyGeoMetric };
