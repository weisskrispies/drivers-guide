-- Driver's Guide schema
-- Run this in your Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds home location + display prefs
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_label text,
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- roads: curated driving roads
-- geometry stored as GeoJSON LineString in `path` (array of [lng, lat])
-- start/end points kept as scalar columns for fast distance sort
-- ---------------------------------------------------------------------------
create table if not exists public.roads (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region text,
  summary text,
  description text,
  distance_miles numeric,
  elevation_gain_ft integer,
  est_drive_minutes integer,
  difficulty text check (difficulty in ('easy','moderate','spirited','expert')),
  surface_quality text check (surface_quality in ('excellent','good','fair','poor','mixed')),
  traffic_notes text,
  characteristics text[] not null default '{}',
  hazards text[] not null default '{}',
  best_time text,
  start_lat double precision not null,
  start_lng double precision not null,
  end_lat double precision not null,
  end_lng double precision not null,
  path jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  submitted_by uuid references auth.users(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roads_is_published_idx on public.roads(is_published);

-- ---------------------------------------------------------------------------
-- completions: user-marked drives
-- ---------------------------------------------------------------------------
create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  road_id uuid not null references public.roads(id) on delete cascade,
  completed_at timestamptz not null default now(),
  rating smallint check (rating between 1 and 5),
  notes text,
  unique (user_id, road_id)
);

create index if not exists completions_user_idx on public.completions(user_id);
create index if not exists completions_road_idx on public.completions(road_id);

-- ---------------------------------------------------------------------------
-- hides: per-user hidden roads (soft "remove" from your list)
-- ---------------------------------------------------------------------------
create table if not exists public.hides (
  user_id uuid not null references auth.users(id) on delete cascade,
  road_id uuid not null references public.roads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, road_id)
);

-- ---------------------------------------------------------------------------
-- suggestions: user-submitted road ideas awaiting curation
-- ---------------------------------------------------------------------------
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  source_url text,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- community_rank: view aggregating completion counts per user
-- ---------------------------------------------------------------------------
create or replace view public.community_rank as
select
  p.id as user_id,
  coalesce(p.display_name, 'Anonymous Driver') as display_name,
  count(c.id)::int as completion_count,
  rank() over (order by count(c.id) desc) as rank
from public.profiles p
left join public.completions c on c.user_id = p.id
group by p.id, p.display_name;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roads enable row level security;
alter table public.completions enable row level security;
alter table public.hides enable row level security;
alter table public.suggestions enable row level security;

-- profiles: read your own, upsert your own
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- roads: anyone (even anon) can read published roads
drop policy if exists "roads_read_published" on public.roads;
create policy "roads_read_published" on public.roads
  for select using (is_published = true);

-- completions: read/write your own; aggregate counts need a view bypass
drop policy if exists "completions_select_own" on public.completions;
create policy "completions_select_own" on public.completions
  for select using (auth.uid() = user_id);
drop policy if exists "completions_insert_own" on public.completions;
create policy "completions_insert_own" on public.completions
  for insert with check (auth.uid() = user_id);
drop policy if exists "completions_delete_own" on public.completions;
create policy "completions_delete_own" on public.completions
  for delete using (auth.uid() = user_id);
drop policy if exists "completions_update_own" on public.completions;
create policy "completions_update_own" on public.completions
  for update using (auth.uid() = user_id);

-- hides: yours only
drop policy if exists "hides_all_own" on public.hides;
create policy "hides_all_own" on public.hides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- suggestions: insert if signed in, read your own
drop policy if exists "suggestions_select_own" on public.suggestions;
create policy "suggestions_select_own" on public.suggestions
  for select using (auth.uid() = user_id);
drop policy if exists "suggestions_insert_signed_in" on public.suggestions;
create policy "suggestions_insert_signed_in" on public.suggestions
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- helper: return aggregate completion counts per road (bypasses per-user RLS)
-- ---------------------------------------------------------------------------
create or replace function public.road_completion_counts()
returns table(road_id uuid, completion_count bigint)
language sql security definer set search_path = public as $$
  select road_id, count(*)::bigint from public.completions group by road_id;
$$;

grant execute on function public.road_completion_counts() to anon, authenticated;
grant select on public.community_rank to anon, authenticated;
