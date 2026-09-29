import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hasOnlySupportedScopes, isSafeRedirectUri, normalizeScopes, verifyPkce } from './mcp-oauth';

describe('MCP OAuth helpers', () => {
  it('allows HTTPS and loopback redirect URIs only', () => {
    expect(isSafeRedirectUri('https://chatgpt.com/connector/oauth/callback')).toBe(true);
    expect(isSafeRedirectUri('http://localhost:3000/callback')).toBe(true);
    expect(isSafeRedirectUri('http://example.com/callback')).toBe(false);
  });

  it('requires supported scopes', () => {
    expect(hasOnlySupportedScopes(normalizeScopes('screenshots:read screenshots:analysis:write'))).toBe(true);
    expect(hasOnlySupportedScopes(normalizeScopes('screenshots:delete'))).toBe(false);
  });

  it('verifies an S256 PKCE challenge', () => {
    const verifier = 'a-very-long-test-verifier-string-that-is-safe';
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce('wrong-verifier', challenge)).toBe(false);
  });
});
