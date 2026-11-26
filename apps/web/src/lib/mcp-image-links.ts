import { createHash, randomBytes } from 'node:crypto';
import { appUrl } from '@/src/lib/mcp-oauth';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const MCP_IMAGE_LINK_TTL_SECONDS = 2 * 60 * 60;

export type LinkableScreenshot = { id: string };

export function hashMcpImageLinkToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMcpImageLinks(
  userId: string,
  screenshots: LinkableScreenshot[]
) {
  if (!userId) throw new Error('Missing screenshot owner.');
  if (!screenshots.length) return [];
  const admin = createAdminClient();
  const ids = [...new Set(screenshots.map(({ id }) => id))];
  const { data: owned, error: ownershipError } = await admin
    .from('screenshots')
    .select('id')
    .eq('user_id', userId)
    .eq('storage_status', 'stored')
    .in('id', ids);
  if (ownershipError || owned?.length !== ids.length)
    throw new Error('One or more screenshots are unavailable.');
  const expiresAt = new Date(
    Date.now() + MCP_IMAGE_LINK_TTL_SECONDS * 1000
  ).toISOString();
  const links = ids.map((screenshotId) => {
    const token = randomBytes(18).toString('base64url');
    return {
      screenshotId,
      token,
      token_hash: hashMcpImageLinkToken(token),
      user_id: userId,
      expires_at: expiresAt
    };
  });
  const { error } = await admin.from('mcp_image_links').insert(
    links.map(({ token, screenshotId, ...record }) => ({
      ...record,
      screenshot_id: screenshotId
    }))
  );
  if (error) throw new Error('Unable to create temporary screenshot links.');
  const baseUrl = appUrl().replace(/\/$/, '');
  return links.map(({ screenshotId, token }) => ({
    screenshotId,
    imageUrl: `${baseUrl}/mcp/image/${token}`,
    expiresAt,
    expiresInSeconds: MCP_IMAGE_LINK_TTL_SECONDS
  }));
}
