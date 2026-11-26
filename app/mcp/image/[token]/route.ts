import { NextResponse } from 'next/server';
import { hashMcpImageLinkToken } from '@/src/lib/mcp-image-links';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
};
function unavailable() { return new NextResponse('Image unavailable or link expired.', { status: 404, headers }); }

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return unavailable();
  try {
    const admin = createAdminClient();
    const { data: link, error: linkError } = await admin.from('mcp_image_links').select('screenshot_id,user_id,expires_at').eq('token_hash', hashMcpImageLinkToken(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (linkError || !link || new Date(link.expires_at).getTime() <= Date.now()) return unavailable();
    const { data: screenshot, error: screenshotError } = await admin.from('screenshots').select('storage_path,mime_type').eq('id', link.screenshot_id).eq('user_id', link.user_id).eq('storage_status', 'stored').maybeSingle();
    if (screenshotError || !screenshot || !['image/jpeg', 'image/png', 'image/webp'].includes(screenshot.mime_type)) return unavailable();
    const { data, error } = await admin.storage.from('screenshots').download(screenshot.storage_path);
    if (error || !data || new Date(link.expires_at).getTime() <= Date.now()) return unavailable();
    return new NextResponse(data.stream(), { headers: { ...headers, 'Content-Type': screenshot.mime_type, 'Content-Disposition': 'inline' } });
  } catch { return unavailable(); }
}
