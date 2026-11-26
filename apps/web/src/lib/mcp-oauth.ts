import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const MCP_SCOPES = ['screenshots:read', 'screenshots:analysis:write'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTHORIZATION_CODE_TTL_SECONDS = 60 * 5;

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function mcpResourceUrl() {
  return `${appUrl()}/mcp`;
}

export function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function randomSecret(prefix: string) {
  return `${prefix}${randomBytes(32).toString('base64url')}`;
}

export function normalizeScopes(value: string | null) {
  const scopes = (value ?? MCP_SCOPES.join(' ')).split(/\s+/).filter(Boolean);
  return Array.from(new Set(scopes));
}

export function hasOnlySupportedScopes(scopes: string[]): scopes is McpScope[] {
  return scopes.length > 0 && scopes.every((scope) => MCP_SCOPES.includes(scope as McpScope));
}

export function isSafeRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch {
    return false;
  }
}

export function verifyPkce(verifier: string, challenge: string) {
  const calculated = createHash('sha256').update(verifier).digest('base64url');
  const left = Buffer.from(calculated);
  const right = Buffer.from(challenge);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function validateAccessToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin.from('mcp_oauth_tokens')
    .select('id,user_id,client_id,scopes,resource,expires_at')
    .eq('token_hash', hashSecret(token))
    .eq('token_type', 'access')
    .is('revoked_at', null)
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() <= Date.now() || data.resource !== mcpResourceUrl()) return null;
  return data;
}

export async function issueTokenPair(input: { userId: string; clientId: string; scopes: string[]; resource: string }) {
  const accessToken = randomSecret('spmca_');
  const refreshToken = randomSecret('spmcr_');
  const admin = createAdminClient();
  const now = Date.now();
  const { error } = await admin.from('mcp_oauth_tokens').insert([
    { token_hash: hashSecret(accessToken), token_type: 'access', user_id: input.userId, client_id: input.clientId, scopes: input.scopes, resource: input.resource, expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString() },
    { token_hash: hashSecret(refreshToken), token_type: 'refresh', user_id: input.userId, client_id: input.clientId, scopes: input.scopes, resource: input.resource, expires_at: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString() },
  ]);
  if (error) throw new Error('Could not issue OAuth tokens.');
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export { AUTHORIZATION_CODE_TTL_SECONDS };
