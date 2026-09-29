import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { isSafeRedirectUri } from '@/src/lib/mcp-oauth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown; token_endpoint_auth_method?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_client_metadata' }, { status: 400 }); }
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((uri): uri is string => typeof uri === 'string' && isSafeRedirectUri(uri)) : [];
  if (!redirectUris.length || redirectUris.length > 10 || body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') {
    return NextResponse.json({ error: 'invalid_client_metadata', error_description: 'A public client needs at least one safe redirect URI.' }, { status: 400 });
  }
  const clientId = `screenpulse_${randomUUID()}`;
  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 120) : 'MCP client';
  const { error } = await createAdminClient().from('mcp_oauth_clients').insert({ client_id: clientId, client_name: clientName, redirect_uris: redirectUris });
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 });
  return NextResponse.json({ client_id: clientId, client_name: clientName, redirect_uris: redirectUris, token_endpoint_auth_method: 'none' }, { status: 201 });
}
