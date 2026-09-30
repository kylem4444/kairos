-- Gallery + test-sale flags. Run in Supabase SQL Editor after admin_migration.sql.

alter table public.artworks
  add column if not exists is_test boolean not null default false;

alter table public.artworks
  add column if not exists destroyed_image_urls text[] not null default '{}';

create index if not exists artworks_is_test_idx
  on public.artworks (is_test);

create index if not exists artworks_gallery_idx
  on public.artworks (status, settled_at desc)
  where status in ('purchased', 'destroyed', 'auto_destroyed')
    and is_test = false;

-- Optional: mark existing settled rows as tests if they came from Stripe test mode
-- (run manually if you know which ids were tests):
-- update public.artworks set is_test = true where id in ('...');
