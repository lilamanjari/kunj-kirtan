create table if not exists public.rare_gem_feature_rotations (
  id uuid primary key default gen_random_uuid(),
  feature_scope text not null,
  feature_date date not null,
  cycle_number integer not null check (cycle_number > 0),
  kirtan_id uuid not null references public.kirtans(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists rare_gem_feature_rotations_scope_date_key
  on public.rare_gem_feature_rotations (feature_scope, feature_date);

create unique index if not exists rare_gem_feature_rotations_cycle_kirtan_key
  on public.rare_gem_feature_rotations (feature_scope, cycle_number, kirtan_id);

create index if not exists rare_gem_feature_rotations_scope_cycle_idx
  on public.rare_gem_feature_rotations (feature_scope, cycle_number desc);

alter table public.rare_gem_feature_rotations enable row level security;

comment on table public.rare_gem_feature_rotations is
  'Daily globally shared Rare Gem feature selections, grouped into non-repeating cycles.';
