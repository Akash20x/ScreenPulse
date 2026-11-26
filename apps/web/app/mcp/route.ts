import { createMcpHandler } from '@modelcontextprotocol/server';
import { NextResponse } from 'next/server';
import { createScreenPulseMcpServer } from '@/src/mcp/mcp-server';
import { appUrl, validateAccessToken } from '@/src/mcp/mcp-oauth';

export const runtime = 'nodejs';

const handler = createMcpHandler(
  async (context) => {
    if (!context.authInfo)
      throw new Error('MCP authentication context is required.');
    return createScreenPulseMcpServer(context.authInfo);
  },
  { legacy: 'stateless', responseMode: 'json' }
);

function unauthorized() {
  return NextResponse.json(
    { error: 'unauthorized' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${appUrl()}/.well-known/oauth-protected-resource"`,
        'cache-control': 'no-store'
      }
    }
  );
}

async function serve(request: Request) {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) return unauthorized();
  const verified = await validateAccessToken(token);
  if (!verified) return unauthorized();
  return handler.fetch(request, {
    authInfo: {
      token,
      clientId: verified.client_id,
      scopes: verified.scopes,
      expiresAt: Math.floor(new Date(verified.expires_at).getTime() / 1000),
      resource: new URL(verified.resource),
      extra: { userId: verified.user_id }
    }
  });
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;
