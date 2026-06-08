create table if not exists public.lead_singer_images (
  id uuid primary key default gen_random_uuid(),
  lead_singer_id uuid not null references public.lead_singers(id) on delete cascade,
  image_key text not null,
  alt_text text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists lead_singer_images_lead_singer_id_idx
  on public.lead_singer_images (lead_singer_id, created_at desc);

alter table public.lead_singer_images
  add constraint lead_singer_images_image_key_not_blank
  check (length(trim(image_key)) > 0);

alter table public.lead_singer_images
  add constraint lead_singer_images_dimensions_positive
  check (
    (width is null or width > 0)
    and (height is null or height > 0)
  );

comment on table public.lead_singer_images is
  'Lead singer portrait and gallery images stored in R2.';

comment on column public.lead_singer_images.image_key is
  'Object key inside the images bucket, for example lead-singers/bb-rasikananda-maharaja/portrait.jpg';
