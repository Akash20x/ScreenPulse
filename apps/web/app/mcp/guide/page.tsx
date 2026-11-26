import { AppNav } from '@/src/components/app-nav';
import { McpGuide } from '@/src/mcp/mcp-guide';
import { requireUser } from '@/src/lib/auth';
import { appUrl, mcpResourceUrl } from '@/src/mcp/mcp-oauth';

export default async function McpGuidePage() {
  const user = await requireUser();
  const baseUrl = appUrl();
  return (
    <main className="shell">
      <AppNav email={user.email} />
      <McpGuide
        endpoint={mcpResourceUrl()}
        isProduction={new URL(baseUrl).protocol === 'https:'}
      />
    </main>
  );
}
