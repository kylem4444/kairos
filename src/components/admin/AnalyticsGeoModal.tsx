"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRY_CENTROIDS,
  projectLonLat,
  type GeoMetricAggregate,
} from "@/lib/geo";

type MetricKey = "pageViews" | "checkoutOpens";

type GeoPayload = {
  pageViews: GeoMetricAggregate;
  checkoutOpens: GeoMetricAggregate;
};

const MAP_W = 720;
const MAP_H = 360;

export function AnalyticsGeoModal({
  initialMetric,
  onClose,
}: {
  initialMetric: MetricKey;
  onClose: () => void;
}) {
  const [metric, setMetric] = useState<MetricKey>(initialMetric);
  const [data, setData] = useState<GeoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/analytics/geo", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error ?? "Could not load map data");
          }
          return;
        }
        if (!cancelled) setData(json as GeoPayload);
      } catch {
        if (!cancelled) setError("Network error loading map data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = data?.[metric] ?? null;
  const maxCount = useMemo(() => {
    if (!active?.byCountry.length) return 1;
    return Math.max(...active.byCountry.map((b) => b.count), 1);
  }, [active]);

  return (
    <div className="admin-geo-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-geo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-geo-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-geo-header">
          <h2 id="admin-geo-title" className="admin-section-title">
            Activity map
          </h2>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="admin-geo-toggle" role="tablist" aria-label="Metric">
          <button
            type="button"
            role="tab"
            aria-selected={metric === "pageViews"}
            className={
              metric === "pageViews"
                ? "admin-geo-tab admin-geo-tab-active"
                : "admin-geo-tab"
            }
            onClick={() => setMetric("pageViews")}
          >
            Page views
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === "checkoutOpens"}
            className={
              metric === "checkoutOpens"
                ? "admin-geo-tab admin-geo-tab-active"
                : "admin-geo-tab"
            }
            onClick={() => setMetric("checkoutOpens")}
          >
            Checkout opens
          </button>
        </div>

        <p className="admin-muted admin-geo-note">
          Approximate location from IP (country / region). Not stored as an IP
          address. Events before this feature have no location.
        </p>

        {loading ? (
          <p className="admin-muted">Loading map…</p>
        ) : error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : active ? (
          <>
            <div className="admin-geo-map-wrap">
              <svg
                className="admin-geo-map"
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                role="img"
                aria-label="World map of activity"
              >
                <rect
                  width={MAP_W}
                  height={MAP_H}
                  fill="var(--bg)"
                  stroke="var(--line)"
                />
                {/* Simple graticule */}
                {Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={(i * MAP_W) / 12}
                    y1={0}
                    x2={(i * MAP_W) / 12}
                    y2={MAP_H}
                    stroke="var(--line)"
                    strokeWidth={0.5}
                  />
                ))}
                {Array.from({ length: 6 }, (_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={(i * MAP_H) / 6}
                    x2={MAP_W}
                    y2={(i * MAP_H) / 6}
                    stroke="var(--line)"
                    strokeWidth={0.5}
                  />
                ))}
                {active.byCountry.map((bucket) => {
                  const centroid = COUNTRY_CENTROIDS[bucket.code];
                  if (!centroid) return null;
                  const { x, y } = projectLonLat(
                    centroid[0],
                    centroid[1],
                    MAP_W,
                    MAP_H,
                  );
                  const r = 4 + (bucket.count / maxCount) * 18;
                  return (
                    <g key={bucket.code}>
                      <circle
                        cx={x}
                        cy={y}
                        r={r}
                        fill="var(--ink)"
                        fillOpacity={0.22 + (bucket.count / maxCount) * 0.45}
                        stroke="var(--ink)"
                        strokeWidth={0.75}
                      >
                        <title>
                          {bucket.code}: {bucket.count}
                        </title>
                      </circle>
                      <text
                        x={x}
                        y={y + 3}
                        textAnchor="middle"
                        fontSize={9}
                        fill="var(--ink)"
                        className="admin-geo-map-label"
                      >
                        {bucket.code}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="admin-geo-lists">
              <div>
                <p className="admin-label">By country</p>
                {active.byCountry.length === 0 ? (
                  <p className="admin-muted">
                    No located events yet
                    {active.unknown > 0
                      ? ` (${active.unknown} without location)`
                      : ""}
                    .
                  </p>
                ) : (
                  <ul className="admin-geo-list">
                    {active.byCountry.slice(0, 12).map((b) => (
                      <li key={b.code}>
                        <span>{b.code}</span>
                        <span>{b.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="admin-label">By region / state</p>
                {active.byRegion.length === 0 ? (
                  <p className="admin-muted">No region data yet.</p>
                ) : (
                  <ul className="admin-geo-list">
                    {active.byRegion.slice(0, 12).map((b) => (
                      <li key={b.code}>
                        <span>{b.code}</span>
                        <span>{b.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <p className="admin-muted">
              Located {active.total - active.unknown} of {active.total}
              {active.unknown > 0
                ? ` · ${active.unknown} unknown / pre-geo`
                : ""}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
