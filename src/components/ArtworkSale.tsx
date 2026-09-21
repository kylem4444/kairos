"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ArtworkPublicView } from "@/lib/types";
import { formatUsdFromCents } from "@/lib/price";
import { ActionButtons } from "./ActionButtons";
import { LivestreamEmbed } from "./LivestreamEmbed";
import { PriceDisplay } from "./PriceDisplay";

type Banner =
  | { kind: "info"; text: string }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

const KAIROS_ONE_GALLERY = [
  "/artwork/kairos-1-full.png",
  "/artwork/kairos-1-detail.png",
] as const;

function galleryFor(imageUrl: string): string[] {
  // Kairos #1 is the current piece — always offer full + detail views
  if (
    imageUrl.includes("kairos-1") ||
    imageUrl.includes("artwork-placeholder") ||
    imageUrl.startsWith("/artwork/")
  ) {
    return [...KAIROS_ONE_GALLERY];
  }
  return [imageUrl];
}

export function ArtworkSale({ initial }: { initial: ArtworkPublicView }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [activeImage, setActiveImage] = useState(0);

  const images = useMemo(
    () => galleryFor(view.artwork.image_url),
    [view.artwork.image_url],
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
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    const demoSettle = searchParams.get("demo_settle");

    async function handleReturn() {
      if (demoSettle === "1" && sessionId) {
        const outcome = searchParams.get("outcome");
        const amount = searchParams.get("amount");
        setBusy(true);
        try {
          const res = await fetch("/api/demo/settle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              outcome,
              amount: amount ? Number(amount) : undefined,
            }),
          });
          const data = await res.json();
          await refresh();
          if (data.winner) {
            setBanner({
              kind: "success",
              text:
                outcome === "destroy"
                  ? "You destroyed the artwork."
                  : "You purchased the artwork.",
            });
          } else {
            setBanner({
              kind: "error",
              text: "Someone else already claimed it. Your demo session did not win.",
            });
          }
        } finally {
          setBusy(false);
          window.history.replaceState({}, "", "/");
        }
        return;
      }

      if (checkout === "cancel") {
        setBanner({
          kind: "info",
          text: "Checkout cancelled. The artwork is still available.",
        });
        window.history.replaceState({}, "", "/");
        return;
      }

      if (checkout === "success" && sessionId) {
        for (let i = 0; i < 8; i++) {
          const res = await fetch(
            `/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`,
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
          await new Promise((r) => setTimeout(r, 750));
        }
        setBanner({
          kind: "info",
          text: "Payment received. Confirming… refresh if the status does not update.",
        });
        window.history.replaceState({}, "", "/");
      }
    }

    void handleReturn();
  }, [searchParams, refresh]);

  const statusCopy = useMemo(() => {
    const { artwork } = view;
    switch (artwork.status) {
      case "live":
        return "Seven days. One million to zero. Purchase or destroy at the current price.";
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

  async function startCheckout(outcome: "purchase" | "destroy") {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          kind: "error",
          text: data.message ?? data.error ?? "Could not start checkout.",
        });
        await refresh();
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBanner({ kind: "error", text: "No checkout URL returned." });
    } catch {
      setBanner({ kind: "error", text: "Network error starting checkout." });
    } finally {
      setBusy(false);
    }
  }

  const { artwork } = view;
  const isLive = artwork.status === "live";
  const showStream =
    (artwork.status === "destroyed" || artwork.status === "auto_destroyed") &&
    artwork.livestream_url;

  return (
    <main className="stage">
      <div className="visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeImage] ?? artwork.image_url}
          alt={artwork.title}
          className="artwork-image"
        />

        {images.length > 1 ? (
          <div className="thumbs" role="tablist" aria-label="Artwork views">
            {images.map((src, index) => (
              <button
                key={src}
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

      <section className="panel">
        <p className="brand">kairos</p>
        <h1 className="title">{artwork.title}</h1>
        <p className="lede">{artwork.description}</p>

        {isLive ? (
          <PriceDisplay
            startPriceCents={artwork.start_price_cents}
            liveAt={artwork.live_at}
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

        <p className="rules">{statusCopy}</p>

        {banner ? (
          <p className={`banner banner-${banner.kind}`} role="status">
            {banner.text}
          </p>
        ) : null}

        {isLive ? (
          <ActionButtons
            disabled={false}
            busy={busy}
            onPurchase={() => void startCheckout("purchase")}
            onDestroy={() => void startCheckout("destroy")}
          />
        ) : null}

        {showStream && artwork.livestream_url ? (
          <LivestreamEmbed url={artwork.livestream_url} />
        ) : null}

        {view.demoMode ? (
          <p className="demo-note">
            Demo mode — no Stripe/Supabase keys detected. Checkout simulates a
            purchase so you can try the flow locally.
          </p>
        ) : null}
      </section>
    </main>
  );
}
