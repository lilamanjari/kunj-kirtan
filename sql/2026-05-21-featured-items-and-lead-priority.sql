create table if not exists public.featured_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  entity_table text not null,
  entity_id uuid not null,
  title_override text null,
  subtitle text null,
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_items_entity_table_check
    check (entity_table in ('kirtans', 'tags', 'lead_singers')),
  constraint featured_items_active_window_check
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists featured_items_slot_active_idx
  on public.featured_items (slot, is_active, sort_order, created_at desc);

alter table public.lead_singers
  add column if not exists priority integer not null default 100;

comment on table public.featured_items is
  'Editorially curated featured content slots for the app home page and future surfaces.';

comment on column public.featured_items.slot is
  'Named placement, for example home_current_vrata or home_hero.';

comment on column public.featured_items.entity_table is
  'The source table for entity_id: kirtans, tags, or lead_singers.';
