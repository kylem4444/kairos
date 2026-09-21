"use client";

import { useEffect, useState } from "react";
import {
  computePriceCents,
  formatUsdFromCents,
} from "@/lib/price";

export function PriceDisplay({
  startPriceCents,
  liveAt,
  durationMs,
  active,
}: {
  startPriceCents: number;
  liveAt: string;
  durationMs: number;
  active: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);

  const cents = active
    ? computePriceCents({
        startPriceCents,
        liveAt,
        durationMs,
        now,
      })
    : startPriceCents;

  return (
    <p className="price" aria-live="polite">
      <span className="price-label">Current price</span>
      <span className="price-value">{formatUsdFromCents(cents)}</span>
    </p>
  );
}
