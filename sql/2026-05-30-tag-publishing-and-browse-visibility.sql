alter table public.tags
  add column if not exists published boolean not null default true,
  add column if not exists browse_visible boolean not null default false;

update public.tags
set published = case
  when category = 'unpublished' then false
  else true
end;

update public.tags
set browse_visible = case
  when category = 'occasion' and published = true then true
  else false
end;

alter table public.tags
  drop constraint if exists tags_browse_visibility_requires_published;

alter table public.tags
  add constraint tags_browse_visibility_requires_published
  check (published = true or browse_visible = false);

comment on column public.tags.published is
  'Whether the tag is publicly accessible anywhere in the app.';

comment on column public.tags.browse_visible is
  'Whether the tag appears in browse surfaces such as the occasions list. Requires published=true.';
