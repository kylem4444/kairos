# kairos

A single-page art sale: one artwork, price decays **linearly from $1,000,000 to $0 over 7 days**. Visitors can **Purchase** or **Destroy** at the current price. Open checkouts never block each other — only a completed payment claims the piece; other Stripe sessions are cancelled.

---

## What each tool is

| Tool | Role |
|------|------|
| **Next.js** | The website + API (checkout, webhooks, cron) |
| **Vercel** | Hosts the site and runs the daily backup cron |
| **Supabase** | Postgres database for artwork status + open checkout sessions |
| **Stripe** | Takes payment; tells us when money actually cleared |

Until you add Supabase/Stripe keys, the app runs in **demo mode** (in-memory store + simulated checkout).

---

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click Purchase or Destroy — demo mode simulates a win without real money.

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

## Phase 3 — Stripe

1. Create an account at [stripe.com](https://stripe.com) (use **test mode** first).
2. Developers → API keys → put the secret key in `.env.local`:

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

### Race rules (already implemented)

- Starting checkout does **not** reserve the artwork.
- First `checkout.session.completed` webhook wins (`UPDATE … WHERE status = 'live'`).
- All other open sessions are **expired** via the Stripe API.
- A late successful payment is **refunded**.

---

## Admin helpers

Set `ADMIN_SECRET` in `.env.local`. The seeded row stays `draft` until `go-live`. That action sets `status` to `live` and `live_at` to the moment of the call, which starts the 7-day decay.

```bash
# Flip the seeded draft live (Supabase). Pass the id from seed.sql (returning id).
# A draft is hidden from the public page, so artworkId is required for first launch.
curl -X POST http://localhost:3000/api/admin ^
  -H "Authorization: Bearer change-me-admin" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"go-live\",\"artworkId\":\"YOUR-UUID\"}"

# Set livestream URL (YouTube or Twitch)
curl -X POST http://localhost:3000/api/admin ^
  -H "Authorization: Bearer change-me-admin" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"set-livestream\",\"url\":\"https://www.youtube.com/watch?v=...\"}"

# Reset demo artwork to live now (demo mode only)
curl -X POST http://localhost:3000/api/admin ^
  -H "Authorization: Bearer change-me-admin" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"reset-demo\"}"
```

---

## Phase 4 — Auto-destroy + livestream

When the week ends and status is still `live`, the piece becomes `auto_destroyed`.

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
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` — signing secret from the Dashboard webhook endpoint
   - `CRON_SECRET`
   - `ADMIN_SECRET`
   - Omit `USE_DEMO_STORE` so production uses Supabase.
4. Run schema + draft seed in Supabase (Phase 2). Call `go-live` when the week should start.
5. Stripe webhook checklist (test mode, then the same steps in live mode):
   - Add an endpoint: `https://YOUR_DOMAIN/api/webhook/stripe`.
   - Subscribe to `checkout.session.completed`. The handler claims the piece on that event, expires other open sessions, and refunds a payment that arrives after the piece is already settled.
   - Put that endpoint’s signing secret in `STRIPE_WEBHOOK_SECRET` and redeploy. The secret from `stripe listen` is only for localhost.
   - Complete one test checkout and confirm the artwork leaves `live`. A second completed payment for the same piece should refund.
   - In live mode, create the endpoint again, then replace the API keys and webhook secret with the live values.

---

## Project map

```
src/app/page.tsx              Single page
src/components/ArtworkSale.tsx  UI + checkout
src/lib/price.ts              7-day linear price math
src/lib/artwork-service.ts    Demo store or Supabase
src/app/api/checkout          Start Stripe (or demo) checkout
src/app/api/webhook/stripe    Claim winner + cancel losers
src/app/api/cron/zero-price   Daily backup auto-destroy at $0
supabase/schema.sql           Database
supabase/seed.sql             Draft artwork (go live via admin)
```
