import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const SHARE_DURATIONS = [1, 24, 168] as const;
export function createShareToken() {
  return randomBytes(32).toString('base64url');
}
export function hashShareToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function isShareToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function findPublicShare(token: string) {
  if (!isShareToken(token)) return null;
  const admin = createAdminClient();
  const { data: share, error } = await admin
    .from('screenshot_public_shares')
    .select('screenshot_id,user_id,notes_snapshot,analysis_snapshot')
    .eq('token_hash', hashShareToken(token))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !share) return null;
  const { data: screenshot } = await admin
    .from('screenshots')
    .select('storage_path,mime_type')
    .eq('id', share.screenshot_id)
    .eq('user_id', share.user_id)
    .eq('storage_status', 'stored')
    .maybeSingle();
  return screenshot ? { ...share, ...screenshot } : null;
}
