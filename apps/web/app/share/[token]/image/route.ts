import { NextResponse } from 'next/server';
import { findPublicShare } from '@/src/lib/screenshot-shares';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const share = await findPublicShare(token);
  const headers = {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  };
  if (!share) return new NextResponse(null, { status: 404, headers });
  const { data, error } = await createAdminClient()
    .storage.from('screenshots')
    .download(share.storage_path);
  if (error || !data) return new NextResponse(null, { status: 404, headers });
  return new NextResponse(await data.arrayBuffer(), {
    headers: { ...headers, 'Content-Type': share.mime_type }
  });
}
