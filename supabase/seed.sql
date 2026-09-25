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
  start_price_cents,
  live_at,
  duration_ms,
  status
) values (
  'Untitled No. 1',
  'One work. One week. The price falls from one million dollars to zero. Purchase it, or destroy it, for whatever the clock shows. If nobody acts, it is destroyed on livestream when the price hits zero.',
  '/artwork/kairos-1-full.png',
  100000000,
  null,
  604800000,
  'draft'
)
returning id;
