-- kairos schema: run this in the Supabase SQL editor

create extension if not exists "pgcrypto";

create type public.artwork_status as enum (
  'draft',
  'live',
  'purchased',
  'destroyed',
  'auto_destroyed'
);

create type public.outcome_type as enum ('purchase', 'destroy');

create type public.checkout_session_status as enum ('open', 'completed', 'expired');

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text not null,
  start_price_cents bigint not null default 100000000,
  live_at timestamptz,
  duration_ms bigint not null default 604800000, -- 7 days
  status public.artwork_status not null default 'draft',
  settled_outcome public.outcome_type,
  settled_at timestamptz,
  settled_amount_cents bigint,
  winning_session_id text,
  livestream_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  artwork_id uuid not null references public.artworks (id) on delete cascade,
  outcome public.outcome_type not null,
  amount_cents bigint not null,
  status public.checkout_session_status not null default 'open',
  created_at timestamptz not null default now()
);

create index checkout_sessions_artwork_open_idx
  on public.checkout_sessions (artwork_id)
  where status = 'open';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger artworks_set_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

alter table public.artworks enable row level security;
alter table public.checkout_sessions enable row level security;

-- Public can read non-draft artworks (anon key). Writes go through service role.
create policy "Public read non-draft artworks"
  on public.artworks
  for select
  to anon, authenticated
  using (status <> 'draft');

-- No public access to checkout_sessions (service role only)
