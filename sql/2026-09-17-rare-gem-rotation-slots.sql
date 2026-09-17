-- Allow a surface to reserve more than one Rare Gem each day. Existing
-- one-per-day selections remain slot 0, so no rotation history is lost.
alter table public.rare_gem_feature_rotations
  add column if not exists feature_slot smallint not null default 0
  check (feature_slot >= 0);

drop index if exists public.rare_gem_feature_rotations_scope_date_key;

create unique index if not exists rare_gem_feature_rotations_scope_date_slot_key
  on public.rare_gem_feature_rotations (feature_scope, feature_date, feature_slot);

comment on column public.rare_gem_feature_rotations.feature_slot is
  'Zero-based position within the daily selection for a feature scope.';
