-- Apply only after exact-path Storage cleanup and screenshot-row cleanup.
do $$
begin
  if exists (select 1 from public.screenshots where device_id is not null) then
    raise exception 'Extension screenshots remain. Finish Storage and row cleanup before removing their origin marker.';
  end if;
end;
$$;

alter table public.screenshots drop constraint screenshots_device_id_fkey;
alter table public.screenshots drop constraint screenshots_user_id_device_id_capture_id_key;
drop index public.screenshots_device_capture_idx;
alter table public.screenshots drop column device_id;
drop table public.devices;
