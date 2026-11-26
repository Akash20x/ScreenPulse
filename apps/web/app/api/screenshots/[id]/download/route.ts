import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  const { id } = await context.params; const admin = createAdminClient();
  const { data: screenshot } = await admin.from('screenshots').select('storage_path,mime_type,page_title').eq('id', id).eq('user_id', user.id).eq('storage_status', 'stored').maybeSingle();
  if (!screenshot) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  const { data: file, error } = await admin.storage.from('screenshots').download(screenshot.storage_path);
  if (error || !file) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  const ext = screenshot.mime_type === 'image/png' ? 'png' : screenshot.mime_type === 'image/webp' ? 'webp' : 'jpg';
  return new NextResponse(await file.arrayBuffer(), { headers: { 'Content-Type': screenshot.mime_type, 'Content-Disposition': `attachment; filename="screenshot-${id}.${ext}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
