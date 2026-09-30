# kairos

A single-page art sale: one artwork, price decays **linearly from $1,000,000 to $0 over 7 days**. Visitors can **Purchase** or **Destroy** at the current price. Checkout stays **on the page** so buyers can enter payment details while watching the price fall, then pay at the exact amount they want. Open payments never block each other — only a completed charge claims the piece; other PaymentIntents are cancelled and late payments are refunded.

---

## What each tool is

| Tool | Role |
|------|------|
| **Next.js** | The website + API (checkout, webhooks, cron) |
| **Vercel** | Hosts the site and runs the daily backup cron |
| **Supabase** | Postgres database for artwork status + open payment sessions |
| **Stripe** | Embedded Payment Element + PaymentIntents |

Until you add Supabase/Stripe keys, the app runs in **demo mode** (in-memory store + simulated pay button on-page).

---

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click Purchase or Destroy — the payment panel opens **on the same page** with the live price still ticking. Demo mode simulates a win without real money.

```bash
npm test          # price math tests
npm run build     # production build check
```

Copy [`.env.example`](.env.example) to `.env.local` when you are ready for real services.

---

## Phase 2 — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. Then run [`supabase/seed.sql`](supabase/seed.sql). The artwork is inserted as **`draft`**, so the price clock stays off and the homepage reads “No artwork is live right now.” Start the week with admin `go-live` when you want the decay to begin (Admin helpers).
4. Settings → API → copy **Project URL** and **service_role** key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

5. Restart `npm run dev`. Demo mode turns off automatically when these are set.

---

## Phase 3 — Stripe (embedded)

Checkout uses **Stripe Payment Element** on the kairos page (not redirect Checkout). The charged amount is created at **Pay-click** time via a PaymentIntent so it matches the live ticker.

1. Create an account at [stripe.com](https://stripe.com) (use **test mode** first).
2. Developers → API keys → put both keys in `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

4. Paste the webhook signing secret as `STRIPE_WEBHOOK_SECRET`. That CLI secret is for local forwarding. Production uses the signing secret on the Dashboard endpoint (Deploy checklist).
5. In the Stripe Dashboard (or CLI), subscribe the endpoint to **`payment_intent.succeeded`**.

### Race rules (already implemented)

- Opening the payment panel does **not** reserve the artwork.
- First `payment_intent.succeeded` webhook wins (`UPDATE … WHERE status = 'live'`).
- All other open PaymentIntents are **cancelled** via the Stripe API.
- A late successful payment is **refunded**.
- Stripe’s card minimum is **$0.50** — below that, pay is blocked until auto-destroy at $0.

---

## Admin dashboard (hidden)

There is **no link** to the admin from the public site. Open it only via URL:

`https://YOUR_DOMAIN/dashboard`  
Local: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

**Security layers**

- Hidden path (not linked, `robots: noindex`)
- Password login (`ADMIN_PASSWORD`) with httpOnly, Secure, SameSite=Strict cookie signed by `ADMIN_SECRET`
- Failed-login rate limit + lockout
- `/api/admin/*` gated by session cookie or `Authorization: Bearer <ADMIN_SECRET>`
- Production refuses admin if either secret is missing

Set both in `.env.local` / Vercel:

```env
ADMIN_SECRET=long-random-signing-secret
ADMIN_PASSWORD=long-random-login-password
```

Locally, if those are unset, the login password defaults to `dev-admin` (never rely on this in production).

**Dashboard features**

- Lifetime revenue (sum of settled purchase/destroy amounts)
- Page views, checkout opens, payments succeeded (7d / 30d / all)
- Create draft artworks, edit title/description/price/duration
- Upload photos (Supabase Storage bucket `artwork`; demo mode uses inline data URLs)
- **Start countdown** (go live) — only one live artwork at a time
- Livestream URL

After schema, run [`supabase/admin_migration.sql`](supabase/admin_migration.sql) on existing projects (adds `image_urls`, `analytics_events`, storage bucket). Fresh installs that use the updated [`schema.sql`](supabase/schema.sql) still need the storage bucket section from the migration (or create bucket `artwork` in the dashboard).

### Curl helpers (optional)

```bash
# Bearer automation still works with ADMIN_SECRET
curl -X POST http://localhost:3000/api/admin ^
  -H "Authorization: Bearer change-me-admin-signing-secret" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"go-live\",\"artworkId\":\"YOUR-UUID\"}"
```

---

## Phase 4 — Auto-destroy + livestream

[`vercel.json`](vercel.json) calls `/api/cron/zero-price`. When the week ends and status is still `live`, it becomes `auto_destroyed`.

**Page load is primary.** Each public read (`getArtworkPublicView`) checks whether the week has elapsed and flips the row on that request. Opening the page after $0 settles the piece.

**Cron is the backup.** [`vercel.json`](vercel.json) calls `GET /api/cron/zero-price` on `0 0 * * *` (daily at 00:00 UTC). Vercel Hobby allows cron jobs once per day, so this repo keeps that daily schedule. If nobody opens the page after zero, the next daily run still settles the piece. A Pro plan can use a tighter schedule; the page-load flip still covers the moment the price hits $0.

On Vercel, set `CRON_SECRET`. Vercel sends `Authorization: Bearer <CRON_SECRET>` when that variable is configured.

Set `livestream_url` with the admin `set-livestream` action; the page embeds YouTube or Twitch.

---

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Set these production env vars (names match [`.env.example`](.env.example)):
   - `NEXT_PUBLIC_APP_URL` — production origin (`https://…`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — required for browser Payment Element
   - `STRIPE_WEBHOOK_SECRET` — signing secret from the Dashboard webhook endpoint
   - `CRON_SECRET`
   - `ADMIN_SECRET` — cookie signing + Bearer automation
   - `ADMIN_PASSWORD` — `/dashboard` login (long random)
   - Omit `USE_DEMO_STORE` so production uses Supabase.
4. Run schema + draft seed in Supabase (Phase 2). Call `go-live` when the week should start.
5. Stripe webhook checklist (test mode, then the same steps in live mode):
   - Add an endpoint: `https://YOUR_DOMAIN/api/webhook/stripe`.
   - Subscribe to **`payment_intent.succeeded`** (not `checkout.session.completed`). The handler claims the piece on that event, cancels other open PaymentIntents, and refunds a payment that arrives after the piece is already settled.
   - Put that endpoint’s signing secret in `STRIPE_WEBHOOK_SECRET` and redeploy. The secret from `stripe listen` is only for localhost.
   - Complete one test payment and confirm the artwork leaves `live`. A second completed payment for the same piece should refund.
   - In live mode, create the endpoint again, then replace the API keys and webhook secret with the live values.

---

## Project map

```
src/app/page.tsx                    Public sale page
src/app/dashboard                   Hidden admin (no public links)
src/components/ArtworkSale.tsx      UI + checkout panel
src/components/EmbeddedCheckout.tsx Stripe Payment Element + live Pay button
src/components/admin/AdminDashboard.tsx
src/lib/price.ts                    7-day linear price math
src/lib/artwork-service.ts          Demo store or Supabase
src/lib/admin-auth.ts               Password session + rate limit
src/app/api/checkout                Readiness check
src/app/api/checkout/confirm        Create PaymentIntent at click-time amount
src/app/api/webhook/stripe          Claim winner + cancel losers
src/app/api/cron/zero-price         Daily backup auto-destroy at $0
src/app/api/admin/*                 Dashboard APIs
src/app/api/analytics/collect       Public allowlisted events
supabase/schema.sql                 Database
supabase/admin_migration.sql        Admin extras for existing DBs
supabase/gallery_migration.sql      is_test + destroyed photos
supabase/seed.sql                   Draft artwork (go live via admin)
src/app/gallery                     Public archive (titles + pictures)
```

---

## Grokbot ops checklist (Supabase / Vercel / admin)

1. **Supabase SQL** — If the project already ran older schema: run `supabase/admin_migration.sql`, then `supabase/gallery_migration.sql` (`is_test`, `destroyed_image_urls`). Fresh project: run `schema.sql`, `seed.sql`, then the Storage section of `admin_migration.sql` (or create public bucket `artwork` with image mime types). In `/dashboard`, **Mark as test** any past Stripe test sales so they leave lifetime revenue and the public gallery.
2. **Vercel env** — Set all vars from `.env.example`, especially `ADMIN_SECRET`, `ADMIN_PASSWORD`, Supabase, Stripe, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`. Redeploy after changing `NEXT_PUBLIC_*`.
3. **Stripe webhook** — `https://YOUR_DOMAIN/api/webhook/stripe` → `payment_intent.succeeded`.
4. **Smoke `/dashboard`** — open only via URL (no site links). Log in with `ADMIN_PASSWORD`. Create/edit artwork, upload photos, start countdown. Confirm public `/` shows the live piece and gallery.
5. **Analytics** — load `/` once, open checkout, complete a test payment; dashboard Overview should show page views / checkout opens / revenue.
6. **Cron** — confirm daily `/api/cron/zero-price` + `CRON_SECRET`.
7. Report: production URL, envs set (names only), migration done, dashboard login OK, photo upload OK, go-live OK.
