import { NextResponse } from 'next/server';
import { appUrl, mcpResourceUrl } from '@/src/mcp/mcp-oauth';

export function GET() {
  return NextResponse.json({
    resource: mcpResourceUrl(),
    authorization_servers: [appUrl()],
    scopes_supported: ['screenshots:read', 'screenshots:analysis:write']
  });
}
