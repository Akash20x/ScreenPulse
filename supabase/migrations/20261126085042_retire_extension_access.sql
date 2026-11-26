-- Block credentials from existing deployments before cleaning legacy captures.
update public.devices set revoked_at = coalesce(revoked_at, now());
revoke all privileges on table public.devices from public, anon, authenticated;
