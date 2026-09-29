import { NextResponse } from 'next/server';
import { hashMcpImageLinkToken } from '@/src/lib/mcp-image-links';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new NextResponse(null, { status: 404 });
  const { data: link } = await createAdminClient().from('mcp_image_links').select('screenshot_id,user_id,expires_at').eq('token_hash', hashMcpImageLinkToken(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!link) return new NextResponse(null, { status: 404 });
  const { data: screenshot } = await createAdminClient().from('screenshots').select('storage_path').eq('id', link.screenshot_id).eq('user_id', link.user_id).eq('storage_status', 'stored').maybeSingle();
  if (!screenshot) return new NextResponse(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from('screenshots').createSignedUrl(screenshot.storage_path, 60);
  if (error || !data?.signedUrl) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 307, headers: { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' } });
}
