import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return new NextResponse(null, { status: 401, headers });
  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: screenshot } = await admin.from('screenshots').select('storage_path,mime_type').eq('id', id).eq('user_id', user.id).eq('storage_status', 'stored').maybeSingle();
  if (!screenshot) return new NextResponse(null, { status: 404, headers });
  const { data, error } = await admin.storage.from('screenshots').download(screenshot.storage_path);
  if (error || !data) return new NextResponse(null, { status: 404, headers });
  return new NextResponse(await data.arrayBuffer(), { headers: { ...headers, 'Content-Type': screenshot.mime_type } });
}
