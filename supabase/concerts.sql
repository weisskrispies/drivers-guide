-- Bay Area Concert Radar schema
-- Run this in your Supabase SQL editor, or via `supabase db push`.
-- This is additive and independent from schema.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- concerts: one row per scraped event, deduped by (source, source_id)
-- ---------------------------------------------------------------------------
create table if not exists public.concerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,               -- e.g. 'ticketmaster', 'seed'
  source_id text not null,            -- stable id from the source
  title text not null,                -- event title as shown by the source
  artists text[] not null default '{}',        -- performing acts, original casing
  artists_normalized text[] not null default '{}', -- lowercased/trimmed for matching
  venue text,
  city text,                          -- normalized display city (e.g. 'Oakland')
  region text,                        -- 'bay-area' bucket for filtering
  event_date date,                    -- local date of the show
  event_time text,                    -- local start time, HH:MM (nullable)
  starts_at timestamptz,              -- best-effort absolute start (nullable)
  price_min numeric,
  price_max numeric,
  currency text,
  url text,                           -- ticket / detail link
  image_url text,
  status text not null default 'onsale',
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists concerts_event_date_idx on public.concerts(event_date);
create index if not exists concerts_city_idx on public.concerts(city);
create index if not exists concerts_artists_norm_idx on public.concerts using gin (artists_normalized);

-- ---------------------------------------------------------------------------
-- subscribers: an email address that wants alerts / saved favorites
-- No password auth; identity is the (verified) email + unsubscribe token.
-- ---------------------------------------------------------------------------
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  favorite_bands text[] not null default '{}',            -- original casing
  favorite_bands_normalized text[] not null default '{}', -- lowercased/trimmed
  cities text[] not null default '{}',                    -- optional city filter for alerts
  alerts_enabled boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscribers_bands_norm_idx
  on public.subscribers using gin (favorite_bands_normalized);

-- ---------------------------------------------------------------------------
-- sent_alerts: dedupe — one row per (subscriber, concert) already emailed
-- ---------------------------------------------------------------------------
create table if not exists public.sent_alerts (
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  concert_id uuid not null references public.concerts(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (subscriber_id, concert_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- Concerts are public read. Subscribers/sent_alerts are only ever touched by
-- the server using the service-role key (which bypasses RLS), so no anon
-- policies are granted for them.
-- ---------------------------------------------------------------------------
alter table public.concerts enable row level security;
alter table public.subscribers enable row level security;
alter table public.sent_alerts enable row level security;

drop policy if exists "concerts_read_all" on public.concerts;
create policy "concerts_read_all" on public.concerts
  for select using (true);

-- No policies on subscribers/sent_alerts: anon/authenticated get no access.
-- The scrape + alert jobs use SUPABASE_SERVICE_ROLE_KEY server-side.
