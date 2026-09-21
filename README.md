# kairos

A single-page art sale: one artwork, price decays **linearly from $1,000,000 to $0 over 7 days**. Visitors can **Purchase** or **Destroy** at the current price. Open checkouts never block each other — only a completed payment claims the piece; other Stripe sessions are cancelled.

---

## What each tool is

| Tool | Role |
|------|------|
| **Next.js** | The website + API (checkout, webhooks, cron) |
| **Vercel** | Hosts the site and runs the every-minute cron |
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
3. Then run [`supabase/seed.sql`](supabase/seed.sql).
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

4. Paste the webhook signing secret as `STRIPE_WEBHOOK_SECRET`.

### Race rules (already implemented)

- Starting checkout does **not** reserve the artwork.
- First `checkout.session.completed` webhook wins (`UPDATE … WHERE status = 'live'`).
- All other open sessions are **expired** via the Stripe API.
- A late successful payment is **refunded**.

---

## Admin helpers

Set `ADMIN_SECRET` in `.env.local`. Then:

```bash
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

# Flip a draft artwork live (Supabase)
curl -X POST http://localhost:3000/api/admin ^
  -H "Authorization: Bearer change-me-admin" ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"go-live\",\"artworkId\":\"YOUR-UUID\"}"
```

---

## Phase 4 — Auto-destroy + livestream

[`vercel.json`](vercel.json) calls `/api/cron/zero-price` every minute. When the week ends and status is still `live`, it becomes `auto_destroyed`. Set `livestream_url` via the admin endpoint; the page embeds YouTube/Twitch.

On Vercel, set `CRON_SECRET` — Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when configured.

---

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Add the same env vars from `.env.example`.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. In Stripe, add a live webhook endpoint: `https://YOUR_DOMAIN/api/webhook/stripe` for `checkout.session.completed`.

---

## Project map

```
src/app/page.tsx              Single page
src/components/ArtworkSale.tsx  UI + checkout
src/lib/price.ts              7-day linear price math
src/lib/artwork-service.ts    Demo store or Supabase
src/app/api/checkout          Start Stripe (or demo) checkout
src/app/api/webhook/stripe    Claim winner + cancel losers
src/app/api/cron/zero-price   Auto-destroy at $0
supabase/schema.sql           Database
```
