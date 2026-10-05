"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  HOMEPAGE_QUOTE,
  HOMEPAGE_QUOTE_CITE_HREF,
  HOMEPAGE_QUOTE_CITE_LABEL,
  SIDEBAR_RULES_AFTER,
  SIDEBAR_RULES_CHOICE,
  SIDEBAR_RULES_LEAD,
  isHomepageLedeText,
} from "@/lib/copy";
import type { ArtworkPublicView, Outcome } from "@/lib/types";
import { galleryUrls } from "@/lib/types";
import { formatUsdFromCents } from "@/lib/price";
import { ActionButtons } from "./ActionButtons";
import { BrandMark } from "./BrandMark";
import { EmbeddedCheckout } from "./EmbeddedCheckout";
import { LivestreamEmbed } from "./LivestreamEmbed";
import { PriceDisplay } from "./PriceDisplay";

/** Per-artwork details (dimensions, etc.) — never the shared homepage lede. */
function artworkDetails(artwork: ArtworkPublicView["artwork"]): string | null {
  const text = artwork.description?.trim();
  if (!text || isHomepageLedeText(text)) return null;
  return text;
}

type Banner =
  | { kind: "info"; text: string }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

function trackEvent(
  name: "page_view" | "checkout_open",
  artworkId: string,
  meta?: Record<string, unknown>,
) {
  void fetch("/api/analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      artwork_id: artworkId,
      meta,
    }),
    keepalive: true,
  }).catch(() => {
    /* ignore analytics failures */
  });
}

export function ArtworkSale({ initial }: { initial: ArtworkPublicView }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [checkoutOutcome, setCheckoutOutcome] = useState<Outcome | null>(null);

  const images = useMemo(
    () => galleryUrls(view.artwork),
    [view.artwork],
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/artwork", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ArtworkPublicView;
    setView(data);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const key = `kairos_pv_${view.artwork.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    trackEvent("page_view", view.artwork.id);
  }, [view.artwork.id]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout !== "return" || !sessionId) return;

    async function handleReturn() {
      setBusy(true);
      try {
        for (let i = 0; i < 10; i++) {
          const res = await fetch(
            `/api/checkout/status?session_id=${encodeURIComponent(sessionId!)}`,
          );
          if (res.ok) {
            const data = await res.json();
            await refresh();
            if (data.youWon) {
              setBanner({
                kind: "success",
                text:
                  data.settledOutcome === "destroy"
                    ? "Payment received. You destroyed the artwork."
                    : "Payment received. You purchased the artwork.",
              });
              window.history.replaceState({}, "", "/");
              return;
            }
            if (data.someoneElse) {
              setBanner({
                kind: "error",
                text: "Someone else claimed it first. If you were charged, you will be refunded.",
              });
              window.history.replaceState({}, "", "/");
              return;
            }
          }
          await new Promise((r) => setTimeout(r, 600));
        }
        setBanner({
          kind: "info",
          text: "Payment received. Confirming… refresh if the status does not update.",
        });
        window.history.replaceState({}, "", "/");
      } finally {
        setBusy(false);
      }
    }

    void handleReturn();
  }, [searchParams, refresh]);

  useEffect(() => {
    if (view.artwork.status !== "live" && checkoutOutcome) {
      setCheckoutOutcome(null);
    }
  }, [view.artwork.status, checkoutOutcome]);

  const settledCopy = useMemo(() => {
    const { artwork } = view;
    switch (artwork.status) {
      case "purchased":
        return `Purchased for ${formatUsdFromCents(artwork.settled_amount_cents ?? 0)}.`;
      case "destroyed":
        return `Destroyed for ${formatUsdFromCents(artwork.settled_amount_cents ?? 0)}.`;
      case "auto_destroyed":
        return "The price reached zero. The artwork is destroyed on livestream.";
      default:
        return "";
    }
  }, [view]);

  async function openCheckout(outcome: Outcome) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/checkout", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          kind: "error",
          text: data.message ?? data.error ?? "Could not start checkout.",
        });
        await refresh();
        return;
      }
      trackEvent("checkout_open", view.artwork.id, { outcome });
      setCheckoutOutcome(outcome);
    } catch {
      setBanner({ kind: "error", text: "Network error starting checkout." });
    } finally {
      setBusy(false);
    }
  }

  const { artwork } = view;
  const isLive = artwork.status === "live";
  const liveAt = artwork.live_at ?? new Date().toISOString();
  const showStream =
    (artwork.status === "destroyed" || artwork.status === "auto_destroyed") &&
    artwork.livestream_url;
  const details = artworkDetails(artwork);

  return (
    <main className="sale">
      <header className="sale-header">
        <div className="brand-lockup sale-seal">
          <BrandMark size={88} className="brand-mark sale-mark" />
          <p className="brand sale-wordmark">Kairos</p>
        </div>
      </header>

      <div className="sale-body">
        <div className="sale-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeImage] ?? artwork.image_url}
            alt={artwork.title}
            className="sale-image"
          />

          {images.length > 1 ? (
            <div className="thumbs" role="tablist" aria-label="Artwork views">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={activeImage === index}
                  className={
                    activeImage === index ? "thumb thumb-active" : "thumb"
                  }
                  onClick={() => setActiveImage(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <section className="sale-panel">
          <h1 className="title">{artwork.title}</h1>
          {details ? <p className="artwork-details">{details}</p> : null}

          {isLive ? (
            <PriceDisplay
              startPriceCents={artwork.start_price_cents}
              liveAt={liveAt}
              durationMs={artwork.duration_ms}
              active
            />
          ) : (
            <p className="price">
              <span className="price-label">Final</span>
              <span className="price-value">
                {artwork.status === "auto_destroyed"
                  ? "$0.00"
                  : formatUsdFromCents(artwork.settled_amount_cents ?? 0)}
              </span>
            </p>
          )}

          {isLive ? (
            <p className="rules">
              {SIDEBAR_RULES_LEAD}
              <br />
              <br />
              {SIDEBAR_RULES_CHOICE}
            </p>
          ) : settledCopy ? (
            <p className="rules">{settledCopy}</p>
          ) : null}

          {banner ? (
            <p className={`banner banner-${banner.kind}`} role="status">
              {banner.text}
            </p>
          ) : null}

          {isLive && checkoutOutcome ? (
            <EmbeddedCheckout
              outcome={checkoutOutcome}
              startPriceCents={artwork.start_price_cents}
              liveAt={liveAt}
              durationMs={artwork.duration_ms}
              onCancel={() => {
                setCheckoutOutcome(null);
                setBanner({
                  kind: "info",
                  text: "Checkout cancelled. The artwork is still available.",
                });
              }}
              onError={(message) => {
                setBanner({ kind: "error", text: message });
              }}
              onSettled={async (result) => {
                setCheckoutOutcome(null);
                await refresh();
                if (result.youWon) {
                  setBanner({
                    kind: "success",
                    text:
                      result.outcome === "destroy"
                        ? "Payment received. You destroyed the artwork."
                        : "Payment received. You purchased the artwork.",
                  });
                } else if (result.someoneElse) {
                  setBanner({
                    kind: "error",
                    text:
                      result.message ??
                      "Someone else claimed it first. If you were charged, you will be refunded.",
                  });
                } else {
                  setBanner({
                    kind: "info",
                    text:
                      result.message ??
                      "Payment submitted. Confirming… refresh if needed.",
                  });
                }
              }}
            />
          ) : null}

          {isLive && !checkoutOutcome ? (
            <>
              <ActionButtons
                disabled={false}
                busy={busy}
                onPurchase={() => void openCheckout("purchase")}
                onDestroy={() => void openCheckout("destroy")}
              />
              <p className="rules">{SIDEBAR_RULES_AFTER}</p>
            </>
          ) : null}

          {showStream && artwork.livestream_url ? (
            <LivestreamEmbed url={artwork.livestream_url} />
          ) : null}

          {view.demoMode ? (
            <p className="demo-note">
              Demo mode — no Stripe/Supabase keys detected. Checkout stays on
              this page so you can watch the price and pay when you want.
            </p>
          ) : null}

          <p className="gallery-link">
            <Link href="/gallery">Gallery</Link>
          </p>
        </section>
      </div>

      <footer className="sale-footer">
        <p className="sale-quote">
          “{HOMEPAGE_QUOTE}”
          <a className="sale-sup" href="#quote-cite-1" aria-label="Citation 1">
            <sup>1</sup>
          </a>
        </p>
        <p id="quote-cite-1" className="sale-footnote">
          <sup>1</sup>{" "}
          <a
            href={HOMEPAGE_QUOTE_CITE_HREF}
            target="_blank"
            rel="noopener noreferrer"
          >
            {HOMEPAGE_QUOTE_CITE_LABEL}
          </a>
        </p>
        <p className="sale-legal-link">
          <Link href="/privacy">Privacy</Link>
        </p>
      </footer>
    </main>
  );
}
