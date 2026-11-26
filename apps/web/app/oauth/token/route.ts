import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { hasOnlySupportedScopes, hashSecret, issueTokenPair, mcpResourceUrl, verifyPkce } from '@/src/lib/mcp-oauth';

export const runtime = 'nodejs';

function error(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: { 'cache-control': 'no-store' } });
}

function response(tokens: { accessToken: string; refreshToken: string; expiresIn: number }, scopes: string[]) {
  return NextResponse.json({ access_token: tokens.accessToken, token_type: 'Bearer', expires_in: tokens.expiresIn, refresh_token: tokens.refreshToken, scope: scopes.join(' ') }, { headers: { 'cache-control': 'no-store', pragma: 'no-cache' } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const grantType = String(form.get('grant_type') ?? '');
  const clientId = String(form.get('client_id') ?? '');
  if (!clientId) return error('invalid_request', 'client_id is required.');
  const admin = createAdminClient();

  if (grantType === 'authorization_code') {
    const code = String(form.get('code') ?? '');
    const redirectUri = String(form.get('redirect_uri') ?? '');
    const verifier = String(form.get('code_verifier') ?? '');
    const { data: authorization } = await admin.from('mcp_oauth_authorization_codes').select('id,user_id,client_id,redirect_uri,scopes,resource,code_challenge,expires_at,used_at').eq('code_hash', hashSecret(code)).maybeSingle();
    if (!authorization || authorization.used_at || new Date(authorization.expires_at).getTime() <= Date.now() || authorization.client_id !== clientId || authorization.redirect_uri !== redirectUri || authorization.resource !== mcpResourceUrl() || !verifyPkce(verifier, authorization.code_challenge) || !hasOnlySupportedScopes(authorization.scopes)) return error('invalid_grant', 'Authorization code is invalid, expired, or does not match this client.');
    const { data: used, error: useError } = await admin.from('mcp_oauth_authorization_codes').update({ used_at: new Date().toISOString() }).eq('id', authorization.id).is('used_at', null).select('id').maybeSingle();
    if (useError || !used) return error('invalid_grant', 'Authorization code has already been used.');
    const tokens = await issueTokenPair({ userId: authorization.user_id, clientId, scopes: authorization.scopes, resource: authorization.resource });
    return response(tokens, authorization.scopes);
  }

  if (grantType === 'refresh_token') {
    const refreshToken = String(form.get('refresh_token') ?? '');
    const { data: existing } = await admin.from('mcp_oauth_tokens').select('id,user_id,client_id,scopes,resource,expires_at').eq('token_hash', hashSecret(refreshToken)).eq('token_type', 'refresh').is('revoked_at', null).maybeSingle();
    if (!existing || existing.client_id !== clientId || existing.resource !== mcpResourceUrl() || new Date(existing.expires_at).getTime() <= Date.now() || !hasOnlySupportedScopes(existing.scopes)) return error('invalid_grant', 'Refresh token is invalid or expired.');
    const { data: revoked } = await admin.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', existing.id).is('revoked_at', null).select('id').maybeSingle();
    if (!revoked) return error('invalid_grant', 'Refresh token has already been used.');
    const tokens = await issueTokenPair({ userId: existing.user_id, clientId, scopes: existing.scopes, resource: existing.resource });
    return response(tokens, existing.scopes);
  }

  return error('unsupported_grant_type', 'Only authorization_code and refresh_token grants are supported.');
}
