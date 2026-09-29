-- kairos admin dashboard migration
-- Run in Supabase SQL Editor after schema.sql (+ seed if needed).

-- Gallery images (ordered). image_url remains the cover / primary.
alter table public.artworks
  add column if not exists image_urls text[] not null default '{}';

-- Backfill gallery from existing cover image
update public.artworks
set image_urls = array[image_url]
where coalesce(cardinality(image_urls), 0) = 0
  and image_url is not null
  and image_url <> '';

-- First-party analytics
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  artwork_id uuid references public.artworks (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check
    check (name in ('page_view', 'checkout_open', 'payment_succeeded'))
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (name, created_at desc);

create index if not exists analytics_events_artwork_idx
  on public.analytics_events (artwork_id)
  where artwork_id is not null;

alter table public.analytics_events enable row level security;
-- No public policies: service role only (Next.js API writes/reads).

-- ---------------------------------------------------------------------------
-- Storage bucket (also creatable in Dashboard → Storage)
-- Bucket id/name: artwork
-- Public read so the sale page can load images; writes only via service role.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artwork',
  'artwork',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for artwork bucket
drop policy if exists "Public read artwork images" on storage.objects;
create policy "Public read artwork images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'artwork');

-- Note: uploads go through the Next.js admin API using the service role key,
-- which bypasses RLS. Do not add public insert policies on this bucket.
