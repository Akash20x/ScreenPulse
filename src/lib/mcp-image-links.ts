import { createHash, randomBytes } from 'node:crypto';
import { appUrl } from '@/src/lib/mcp-oauth';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const MCP_IMAGE_LINK_TTL_SECONDS = 60;

export type LinkableScreenshot = { id: string };

export function hashMcpImageLinkToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMcpImageLinks(userId: string, screenshots: LinkableScreenshot[]) {
  const expiresAt = new Date(Date.now() + MCP_IMAGE_LINK_TTL_SECONDS * 1000).toISOString();
  const links = screenshots.map((screenshot) => {
    const token = randomBytes(18).toString('base64url');
    return { screenshotId: screenshot.id, token, token_hash: hashMcpImageLinkToken(token), user_id: userId, expires_at: expiresAt };
  });
  if (!links.length) return [];
  const { error } = await createAdminClient().from('mcp_image_links').insert(links.map(({ token, screenshotId, ...record }) => ({ ...record, screenshot_id: screenshotId })));
  if (error) throw new Error('Unable to create private screenshot links.');
  const baseUrl = appUrl().replace(/\/$/, '');
  return links.map(({ screenshotId, token }) => ({ screenshotId, imageUrl: `${baseUrl}/mcp/image/${token}`, expiresInSeconds: MCP_IMAGE_LINK_TTL_SECONDS }));
}
