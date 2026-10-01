-- Seed one artwork as draft. The sale clock starts only on admin go-live:
--   POST /api/admin
--   Authorization: Bearer <ADMIN_SECRET>
--   { "action": "go-live", "artworkId": "<id returned by this insert>" }
-- That call sets status to 'live' and live_at to the moment of the request.
-- Until then the public page shows no live artwork.

insert into public.artworks (
  title,
  description,
  image_url,
  image_urls,
  start_price_cents,
  live_at,
  duration_ms,
  status
) values (
  'Untitled No. 1',
  'Oil on canvas · 48 × 60 in',
  '/artwork/kairos-1-full.png',
  array[
    '/artwork/kairos-1-full.png',
    '/artwork/kairos-1-detail.png'
  ],
  100000000,
  null,
  604800000,
  'draft'
)
returning id;
