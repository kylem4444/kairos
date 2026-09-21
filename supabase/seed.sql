-- Seed one artwork. After running schema.sql, run this, then flip to live
-- either here or via POST /api/admin/go-live with your admin secret.

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
  now(),
  604800000,
  'live'
);
