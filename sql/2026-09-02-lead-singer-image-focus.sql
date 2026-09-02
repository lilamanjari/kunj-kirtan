alter table public.lead_singer_images
  add column if not exists focus_x numeric(5,2);

alter table public.lead_singer_images
  add column if not exists focus_y numeric(5,2);

update public.lead_singer_images
set
  focus_x = coalesce(focus_x, 50),
  focus_y = coalesce(focus_y, 35)
where focus_x is null or focus_y is null;

alter table public.lead_singer_images
  alter column focus_x set default 50,
  alter column focus_y set default 35;

alter table public.lead_singer_images
  alter column focus_x set not null,
  alter column focus_y set not null;

alter table public.lead_singer_images
  drop constraint if exists lead_singer_images_focus_x_range,
  drop constraint if exists lead_singer_images_focus_y_range;

alter table public.lead_singer_images
  add constraint lead_singer_images_focus_x_range
    check (focus_x >= 0 and focus_x <= 100),
  add constraint lead_singer_images_focus_y_range
    check (focus_y >= 0 and focus_y <= 100);

comment on column public.lead_singer_images.focus_x is
  'Horizontal portrait focal point as a percentage from 0 to 100.';

comment on column public.lead_singer_images.focus_y is
  'Vertical portrait focal point as a percentage from 0 to 100.';
