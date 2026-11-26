import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { hashSecret } from '@/src/mcp/mcp-oauth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');
  const clientId = String(form.get('client_id') ?? '');
  if (token && clientId)
    await createAdminClient()
      .from('mcp_oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSecret(token))
      .eq('client_id', clientId)
      .is('revoked_at', null);
  return new NextResponse(null, { status: 200 });
}
