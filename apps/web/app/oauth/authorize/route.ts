import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import {
  appUrl,
  AUTHORIZATION_CODE_TTL_SECONDS,
  hasOnlySupportedScopes,
  hashSecret,
  mcpResourceUrl,
  normalizeScopes,
  randomSecret
} from '@/src/lib/mcp-oauth';

export const runtime = 'nodejs';

type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string | null;
  codeChallenge: string;
  resource: string;
};

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status }
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ]!
  );
}

async function validate(
  url: URL
): Promise<AuthorizationRequest | NextResponse> {
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const codeChallenge = url.searchParams.get('code_challenge');
  const responseType = url.searchParams.get('response_type');
  const resource = url.searchParams.get('resource') ?? mcpResourceUrl();
  const scopes = normalizeScopes(url.searchParams.get('scope'));
  if (
    responseType !== 'code' ||
    !clientId ||
    !redirectUri ||
    !codeChallenge ||
    url.searchParams.get('code_challenge_method') !== 'S256'
  )
    return oauthError(
      'invalid_request',
      'Authorization code flow with S256 PKCE is required.'
    );
  if (resource !== mcpResourceUrl())
    return oauthError(
      'invalid_target',
      'The requested resource is not this MCP server.'
    );
  if (!hasOnlySupportedScopes(scopes))
    return oauthError('invalid_scope', 'Requested scope is not supported.');
  const { data: client } = await createAdminClient()
    .from('mcp_oauth_clients')
    .select('client_id,client_name,redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle();
  if (!client || !client.redirect_uris.includes(redirectUri))
    return oauthError(
      'invalid_client',
      'Client or redirect URI is not registered.'
    );
  return {
    clientId,
    redirectUri,
    scopes,
    state: url.searchParams.get('state'),
    codeChallenge,
    resource
  };
}

function consentForm(request: AuthorizationRequest, clientName: string) {
  const input = (name: string, value: string | null) =>
    `<input type="hidden" name="${name}" value="${escapeHtml(value ?? '')}">`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize ScreenPulse</title><style>body{font-family:Arial,sans-serif;background:#f6f8fa;color:#17212f;margin:0;padding:36px}.card{background:#fff;border:1px solid #dfe5eb;border-radius:14px;margin:auto;max-width:520px;padding:28px}button{background:#0a6d67;border:0;border-radius:8px;color:#fff;font-weight:bold;padding:11px 16px}button.secondary{background:#fff;border:1px solid #dfe5eb;color:#17212f;margin-left:8px}</style></head><body><main class="card"><p>SCREENPULSE</p><h1>Allow ${escapeHtml(clientName)}?</h1>${request.scopes.includes('screenshots:read') ? '<p>Read your folders, screenshot images, saved analysis, and additional notes. Notes are included when explicitly requested for a selected screenshot.</p>' : ''}${request.scopes.includes('screenshots:analysis:write') ? '<p>Save AI screenshot descriptions when you ask.</p>' : ''}<form method="post">${input('client_id', request.clientId)}${input('redirect_uri', request.redirectUri)}${input('scope', request.scopes.join(' '))}${input('state', request.state)}${input('code_challenge', request.codeChallenge)}${input('resource', request.resource)}<button name="decision" value="allow" type="submit">Allow</button><button class="secondary" name="decision" value="deny" type="submit">Deny</button></form></main></body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorization = await validate(url);
  if (authorization instanceof NextResponse) return authorization;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.redirect(
      `${appUrl()}/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`
    );
  const { data: client } = await createAdminClient()
    .from('mcp_oauth_clients')
    .select('client_name')
    .eq('client_id', authorization.clientId)
    .single();
  return new NextResponse(
    consentForm(authorization, client?.client_name ?? 'MCP client'),
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const url = new URL(`${appUrl()}/oauth/authorize`);
  [
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'resource'
  ].forEach((key) => {
    const value = form.get(key);
    if (typeof value === 'string') url.searchParams.set(key, value);
  });
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge_method', 'S256');
  const authorization = await validate(url);
  if (authorization instanceof NextResponse) return authorization;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.redirect(
      `${appUrl()}/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`
    );
  const redirect = new URL(authorization.redirectUri);
  if (form.get('decision') !== 'allow') {
    redirect.searchParams.set('error', 'access_denied');
    if (authorization.state)
      redirect.searchParams.set('state', authorization.state);
    return NextResponse.redirect(redirect);
  }
  const code = randomSecret('spmcc_');
  const { error } = await createAdminClient()
    .from('mcp_oauth_authorization_codes')
    .insert({
      code_hash: hashSecret(code),
      user_id: user.id,
      client_id: authorization.clientId,
      redirect_uri: authorization.redirectUri,
      scopes: authorization.scopes,
      resource: authorization.resource,
      code_challenge: authorization.codeChallenge,
      expires_at: new Date(
        Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000
      ).toISOString()
    });
  if (error)
    return oauthError('server_error', 'Could not complete authorization.', 500);
  redirect.searchParams.set('code', code);
  if (authorization.state)
    redirect.searchParams.set('state', authorization.state);
  return NextResponse.redirect(redirect);
}
