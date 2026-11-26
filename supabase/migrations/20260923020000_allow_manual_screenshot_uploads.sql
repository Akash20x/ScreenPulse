alter table public.screenshots alter column device_id drop not null;

alter table public.screenshots drop constraint if exists screenshots_mime_type_check;
alter table public.screenshots add constraint screenshots_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp'));

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'screenshots';
