"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAnalytics, Artwork } from "@/lib/types";
import { formatUsdFromCents } from "@/lib/price";

type SessionState = {
  authenticated: boolean;
  configured: boolean;
  demoMode: boolean;
  message?: string;
};

export function AdminDashboard() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [analytics, setAnalytics] = useState<
    (AdminAnalytics & { lifetimeRevenueFormatted?: string }) | null
  >(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = artworks.find((a) => a.id === selectedId) ?? null;

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) {
      const fallback: SessionState = {
        authenticated: false,
        configured: true,
        demoMode: true,
        message: "Could not reach session API",
      };
      setSession(fallback);
      return fallback;
    }
    const data = (await res.json()) as SessionState;
    setSession(data);
    return data;
  }, []);

  const loadData = useCallback(async () => {
    const [artRes, analyticsRes] = await Promise.all([
      fetch("/api/admin/artworks", { cache: "no-store" }),
      fetch("/api/admin/analytics", { cache: "no-store" }),
    ]);
    if (artRes.ok) {
      const data = await artRes.json();
      setArtworks(data.artworks ?? []);
    }
    if (analyticsRes.ok) {
      setAnalytics(await analyticsRes.json());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await refreshSession();
        if (cancelled) return;
        if (s.authenticated) await loadData();
      } catch {
        if (!cancelled) {
          setSession({
            authenticated: false,
            configured: true,
            demoMode: true,
            message: "Network error loading session",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, loadData]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message ?? data.error ?? "Login failed");
        return;
      }
      setPassword("");
      await refreshSession();
      await loadData();
    } catch {
      setLoginError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setArtworks([]);
    setAnalytics(null);
    setSelectedId(null);
    await refreshSession();
  }

  if (!session) {
    return (
      <main className="admin-shell">
        <p className="admin-muted">Loading…</p>
      </main>
    );
  }

  if (!session.configured && process.env.NODE_ENV === "production") {
    return (
      <main className="admin-shell">
        <p className="brand">kairos</p>
        <p className="admin-muted">
          {session.message ?? "Admin is not configured."}
        </p>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main className="admin-shell admin-login">
        <p className="brand">kairos</p>
        <h1 className="admin-title">Dashboard</h1>
        <form className="admin-login-form" onSubmit={(e) => void login(e)}>
          <label className="admin-label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            className="admin-input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {loginError ? (
            <p className="banner banner-error" role="alert">
              {loginError}
            </p>
          ) : null}
          <button type="submit" className="btn btn-purchase" disabled={busy}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="brand">kairos</p>
          <p className="admin-title">Dashboard</p>
          {session.demoMode ? (
            <p className="admin-muted">Demo mode — in-memory store</p>
          ) : null}
        </div>
        <button type="button" className="btn" onClick={() => void logout()}>
          Log out
        </button>
      </header>

      {notice ? (
        <p className="banner banner-info" role="status">
          {notice}
        </p>
      ) : null}

      <AnalyticsPanel analytics={analytics} />

      <section className="admin-grid">
        <ArtworkList
          artworks={artworks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreated={async (artwork) => {
            await loadData();
            setSelectedId(artwork.id);
            setNotice("Draft artwork created.");
          }}
          onNotice={setNotice}
        />

        {selected ? (
          <ArtworkEditor
            key={selected.id}
            artwork={selected}
            onUpdated={async () => {
              await loadData();
              setNotice("Saved.");
            }}
            onDeleted={async () => {
              setSelectedId(null);
              await loadData();
              setNotice("Draft deleted.");
            }}
            onNotice={setNotice}
          />
        ) : (
          <div className="admin-panel">
            <p className="admin-muted">Select an artwork to edit.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function AnalyticsPanel({
  analytics,
}: {
  analytics: (AdminAnalytics & { lifetimeRevenueFormatted?: string }) | null;
}) {
  if (!analytics) {
    return (
      <section className="admin-panel admin-panel-overview">
        <p className="admin-muted">Loading analytics…</p>
      </section>
    );
  }

  return (
    <section className="admin-panel admin-panel-overview">
      <h2 className="admin-section-title admin-section-title-center">
        Overview
      </h2>
      <div className="admin-stats">
        <Stat
          label="Lifetime revenue"
          value={
            analytics.lifetimeRevenueFormatted ??
            formatUsdFromCents(analytics.lifetimeRevenueCents)
          }
        />
        <Stat label="Completed sales" value={String(analytics.completedSales)} />
        <Stat
          label="Page views"
          value={`${analytics.pageViews.all}`}
          hint={`7d ${analytics.pageViews.last7d} · 30d ${analytics.pageViews.last30d}`}
        />
        <Stat
          label="Checkout opens"
          value={`${analytics.checkoutOpens.all}`}
          hint={`7d ${analytics.checkoutOpens.last7d} · 30d ${analytics.checkoutOpens.last30d}`}
        />
        <Stat
          label="Payments succeeded"
          value={`${analytics.paymentSucceeded.all}`}
          hint={`7d ${analytics.paymentSucceeded.last7d} · 30d ${analytics.paymentSucceeded.last30d}`}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="admin-stat">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      {hint ? <p className="admin-muted">{hint}</p> : null}
    </div>
  );
}

function ArtworkList({
  artworks,
  selectedId,
  onSelect,
  onCreated,
  onNotice,
}: {
  artworks: Artwork[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (artwork: Artwork) => void | Promise<void>;
  onNotice: (msg: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  async function createDraft() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice(data.error ?? "Could not create artwork");
        return;
      }
      await onCreated(data.artwork as Artwork);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-row">
        <h2 className="admin-section-title">Artworks</h2>
        <button
          type="button"
          className="btn btn-purchase"
          disabled={creating}
          onClick={() => void createDraft()}
        >
          {creating ? "Creating…" : "New draft"}
        </button>
      </div>
      <ul className="admin-list">
        {artworks.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className={
                selectedId === a.id
                  ? "admin-list-item admin-list-item-active"
                  : "admin-list-item"
              }
              onClick={() => onSelect(a.id)}
            >
              <span className="admin-list-title">{a.title}</span>
              <span className="admin-list-meta">{a.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArtworkEditor({
  artwork,
  onUpdated,
  onDeleted,
  onNotice,
}: {
  artwork: Artwork;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
  onNotice: (msg: string) => void;
}) {
  const [title, setTitle] = useState(artwork.title);
  const [startPrice, setStartPrice] = useState(
    String(artwork.start_price_cents / 100),
  );
  const [durationDays, setDurationDays] = useState(
    String(artwork.duration_ms / (24 * 60 * 60 * 1000)),
  );
  const [livestreamUrl, setLivestreamUrl] = useState(
    artwork.livestream_url ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const priceDollars = Number(startPrice);
      const days = Number(durationDays);
      const res = await fetch(`/api/admin/artworks/${artwork.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          start_price_cents: Math.round(priceDollars * 100),
          duration_ms: Math.round(days * 24 * 60 * 60 * 1000),
          livestream_url: livestreamUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice(data.error ?? "Save failed");
        return;
      }
      await onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function deleteDraft() {
    if (
      !window.confirm(
        `Delete draft “${artwork.title}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/artworks/${artwork.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice(data.message ?? data.error ?? "Could not delete draft");
        return;
      }
      await onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  async function goLive() {
    setGoingLive(true);
    try {
      const res = await fetch(`/api/admin/artworks/${artwork.id}/go-live`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice(data.message ?? data.error ?? "Could not go live");
        return;
      }
      onNotice("Countdown started — artwork is live.");
      await onUpdated();
    } finally {
      setGoingLive(false);
    }
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("artworkId", artwork.id);
      for (const file of Array.from(files)) {
        form.append("files", file);
      }
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice(data.error ?? "Upload failed");
        return;
      }
      onNotice(`Uploaded ${data.urls?.length ?? 0} photo(s).`);
      await onUpdated();
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    const next = artwork.image_urls.filter((u) => u !== url);
    const res = await fetch(`/api/admin/artworks/${artwork.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_urls: next.length > 0 ? next : ["/artwork-placeholder.svg"],
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      onNotice(data.error ?? "Could not remove image");
      return;
    }
    await onUpdated();
  }

  return (
    <section className="admin-panel">
      <div className="admin-row">
        <h2 className="admin-section-title">Edit</h2>
        <span className="admin-list-meta">{artwork.status}</span>
      </div>

      <label className="admin-label" htmlFor="title">
        Title
      </label>
      <input
        id="title"
        className="admin-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="admin-fields">
        <div>
          <label className="admin-label" htmlFor="price">
            Start price (USD)
          </label>
          <input
            id="price"
            className="admin-input"
            type="number"
            min={0}
            step="0.01"
            value={startPrice}
            onChange={(e) => setStartPrice(e.target.value)}
            disabled={artwork.status === "live"}
          />
        </div>
        <div>
          <label className="admin-label" htmlFor="days">
            Duration (days)
          </label>
          <input
            id="days"
            className="admin-input"
            type="number"
            min={0.01}
            step="0.01"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            disabled={artwork.status === "live"}
          />
        </div>
      </div>

      <label className="admin-label" htmlFor="livestream">
        Livestream URL
      </label>
      <input
        id="livestream"
        className="admin-input"
        value={livestreamUrl}
        onChange={(e) => setLivestreamUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=…"
      />

      <div className="admin-photos">
        <p className="admin-label">Photos</p>
        <div className="admin-thumbs">
          {artwork.image_urls.map((url) => (
            <div key={url} className="admin-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button
                type="button"
                className="admin-thumb-remove"
                onClick={() => void removeImage(url)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <label className="btn admin-upload-btn">
          {uploading ? "Uploading…" : "Add photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            disabled={uploading}
            onChange={(e) => {
              void onFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="checkout-actions">
        <button
          type="button"
          className="btn btn-purchase"
          disabled={saving || deleting}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {artwork.status === "draft" ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={goingLive || deleting}
              onClick={() => void goLive()}
            >
              {goingLive ? "Starting…" : "Start countdown"}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleting || saving || goingLive}
              onClick={() => void deleteDraft()}
            >
              {deleting ? "Deleting…" : "Delete draft"}
            </button>
          </>
        ) : null}
      </div>

      {artwork.status === "purchased" || artwork.status === "destroyed" ? (
        <p className="admin-muted">
          Settled{" "}
          {formatUsdFromCents(artwork.settled_amount_cents ?? 0)} (
          {artwork.settled_outcome})
        </p>
      ) : null}
    </section>
  );
}
