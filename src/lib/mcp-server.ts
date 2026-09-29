import { McpServer } from '@modelcontextprotocol/server';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { createMcpImageLinks, MCP_IMAGE_LINK_TTL_SECONDS } from '@/src/lib/mcp-image-links';
import { createAdminClient } from '@/src/lib/supabase/admin';

type Screenshot = { id: string; page_url: string; page_title: string | null; captured_at: string; storage_path: string; analysis_description: string | null };
const screenshotAnalysisSchema = z.object({ screenshotId: z.string().uuid(), description: z.string().trim().min(1).max(10000) });
const saveScreenshotAnalysisSchema = z.union([
  screenshotAnalysisSchema,
  z.object({ analyses: z.array(screenshotAnalysisSchema).min(1).max(5) }).superRefine(({ analyses }, context) => {
    if (new Set(analyses.map(({ screenshotId }) => screenshotId)).size !== analyses.length) {
      context.addIssue({ code: 'custom', message: 'Each screenshotId may appear only once.' });
    }
  }),
]);

function domain(url: string) { try { return new URL(url).hostname; } catch { return url; } }
function metadata(screenshot: Screenshot) { return { id: screenshot.id, pageTitle: screenshot.page_title, pageUrl: screenshot.page_url, domain: domain(screenshot.page_url), capturedAt: screenshot.captured_at, analysisDescription: screenshot.analysis_description }; }

async function loadScreenshot(userId: string, id: string) {
  const { data } = await createAdminClient().from('screenshots').select('id,page_url,page_title,captured_at,storage_path,analysis_description').eq('id', id).eq('user_id', userId).eq('storage_status', 'stored').maybeSingle();
  return data as Screenshot | null;
}

function metadataWithImageUrl(screenshot: Screenshot, imageUrl: string) {
  return { ...metadata(screenshot), imageUrl, imageUrlExpiresInSeconds: MCP_IMAGE_LINK_TTL_SECONDS };
}

function text(value: unknown) { return { type: 'text' as const, text: JSON.stringify(value, null, 2) }; }

async function imageContent(screenshot: Screenshot) {
  const { data, error } = await createAdminClient().storage.from('screenshots').download(screenshot.storage_path);
  if (error || !data) throw new Error('Unable to load private screenshot image.');
  return { type: 'image' as const, data: Buffer.from(await data.arrayBuffer()).toString('base64'), mimeType: 'image/jpeg' };
}

async function metadataWithManualPreview(userId: string, screenshot: Screenshot) {
  try {
    const [link] = await createMcpImageLinks(userId, [screenshot]);
    return link ? metadataWithImageUrl(screenshot, link.imageUrl) : metadata(screenshot);
  } catch {
    // A manual browser preview is optional; it must not prevent Codex from inspecting the image.
    return metadata(screenshot);
  }
}

export function createScreenPulseMcpServer(authInfo: AuthInfo) {
  const userId = String(authInfo.extra?.userId ?? '');
  const scopes = new Set(authInfo.scopes);
  const readable = () => scopes.has('screenshots:read');
  const writable = () => scopes.has('screenshots:analysis:write');
  const server = new McpServer({ name: 'screenpulse', version: '0.1.0' });

  server.registerTool('get_profile', { description: 'Get the connected ScreenPulse account profile.', annotations: { readOnlyHint: true }, _meta: { 'openai/profile': true } }, async () => ({ content: [text({ userId })], structuredContent: { userId } }));
  server.registerTool('get_latest_screenshot', { description: 'Get the newest private ScreenPulse screenshot as JPEG image content for Codex inspection. A short-lived browser preview URL may also be included in metadata.', annotations: { readOnlyHint: true } }, async () => {
    if (!readable()) return { isError: true, content: [text({ error: 'Missing screenshots:read scope.' })] };
    const { data } = await createAdminClient().from('screenshots').select('id,page_url,page_title,captured_at,storage_path,analysis_description').eq('user_id', userId).eq('storage_status', 'stored').order('captured_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return { isError: true, content: [text({ error: 'No stored screenshots found.' })] };
    const screenshot = data as Screenshot;
    try {
      const result = await metadataWithManualPreview(userId, screenshot);
      return { content: [text(result), await imageContent(screenshot)], structuredContent: result };
    } catch {
      return { isError: true, content: [text({ error: 'Unable to load screenshot image.' })] };
    }
  });
  server.registerTool('get_screenshot', { description: 'Get one private ScreenPulse screenshot as JPEG image content for Codex inspection by ID. A short-lived browser preview URL may also be included in metadata.', inputSchema: z.object({ screenshotId: z.string().uuid() }), annotations: { readOnlyHint: true } }, async ({ screenshotId }) => {
    if (!readable()) return { isError: true, content: [text({ error: 'Missing screenshots:read scope.' })] };
    const screenshot = await loadScreenshot(userId, screenshotId);
    if (!screenshot) return { isError: true, content: [text({ error: 'Screenshot not found.' })] };
    try {
      const result = await metadataWithManualPreview(userId, screenshot);
      return { content: [text(result), await imageContent(screenshot)], structuredContent: result };
    } catch {
      return { isError: true, content: [text({ error: 'Unable to load screenshot image.' })] };
    }
  });
  server.registerTool('get_latest_five_screenshots', { description: 'Get the latest five screenshots for inspection and description.', annotations: { readOnlyHint: true } }, async () => {
    if (!readable()) return { isError: true, content: [text({ error: 'Missing screenshots:read scope.' })] };
    const { data, error } = await createAdminClient().from('screenshots').select('id,page_url,page_title,captured_at,storage_path,analysis_description').eq('user_id', userId).eq('storage_status', 'stored').order('captured_at', { ascending: false }).order('id', { ascending: false }).limit(5);
    if (error) return { isError: true, content: [text({ error: 'Unable to load recent screenshots.' })] };
    const screenshots = (data ?? []) as Screenshot[];
    if (!screenshots.length) return { isError: true, content: [text({ error: 'No stored screenshots found.' })] };
    let links: Awaited<ReturnType<typeof createMcpImageLinks>> = [];
    try { links = await createMcpImageLinks(userId, screenshots); } catch { /* Manual browser previews are optional. */ }
    const result = screenshots.map((screenshot, index) => links[index] ? metadataWithImageUrl(screenshot, links[index].imageUrl) : metadata(screenshot));
    try {
      const images = await Promise.all(screenshots.map(imageContent));
      return { content: [text({ screenshots: result }), ...images], structuredContent: { screenshots: result } };
    } catch {
      return { isError: true, content: [text({ error: 'Unable to load one or more screenshot images.' })] };
    }
  });
  server.registerTool('list_screenshots', { description: 'List private stored screenshots in gallery order, newest first. A short-lived manual browser preview URL may be included; use get_screenshot to inspect image pixels. Use nextOffset to retrieve later pages.', inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional() }), annotations: { readOnlyHint: true } }, async ({ limit = 20, offset = 0 }) => {
    if (!readable()) return { isError: true, content: [text({ error: 'Missing screenshots:read scope.' })] };
    const { data, error } = await createAdminClient().from('screenshots').select('id,page_url,page_title,captured_at,storage_path,analysis_description').eq('user_id', userId).eq('storage_status', 'stored').order('captured_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + limit - 1);
    if (error) return { isError: true, content: [text({ error: 'Unable to list screenshots.' })] };
    const ownedScreenshots = (data ?? []) as Screenshot[];
    let links: Awaited<ReturnType<typeof createMcpImageLinks>> = [];
    try { links = await createMcpImageLinks(userId, ownedScreenshots); } catch { /* Manual browser previews are optional. */ }
    const screenshots = ownedScreenshots.map((screenshot, index) => links[index] ? metadataWithImageUrl(screenshot, links[index].imageUrl) : metadata(screenshot));
    const nextOffset = screenshots.length === limit ? offset + screenshots.length : null;
    return { content: [text({ screenshots, nextOffset })], structuredContent: { screenshots, nextOffset } };
  });
  server.registerTool('list_unanalyzed_screenshots', { description: 'List recent owned screenshots that do not yet have a Codex description.', inputSchema: z.object({ limit: z.number().int().min(1).max(10).optional() }), annotations: { readOnlyHint: true } }, async ({ limit = 5 }) => {
    if (!readable()) return { isError: true, content: [text({ error: 'Missing screenshots:read scope.' })] };
    const { data } = await createAdminClient().from('screenshots').select('id,page_url,page_title,captured_at,analysis_description').eq('user_id', userId).eq('storage_status', 'stored').is('analysis_description', null).order('captured_at', { ascending: false }).limit(limit);
    const screenshots = (data ?? []).map((screenshot) => ({ id: screenshot.id, pageTitle: screenshot.page_title, pageUrl: screenshot.page_url, domain: domain(screenshot.page_url), capturedAt: screenshot.captured_at }));
    return { content: [text({ screenshots })], structuredContent: { screenshots } };
  });
  server.registerTool('save_screenshot_analysis', { description: 'Save one or up to five factual Codex screenshot descriptions in one request.', inputSchema: saveScreenshotAnalysisSchema, annotations: { readOnlyHint: false, destructiveHint: false } }, async (input) => {
    if (!writable()) return { isError: true, content: [text({ error: 'Missing screenshots:analysis:write scope.' })] };
    const analyses = 'analyses' in input ? input.analyses : [input];
    const screenshotIds = analyses.map(({ screenshotId }) => screenshotId);
    const admin = createAdminClient();
    const { data: owned, error: ownershipError } = await admin.from('screenshots').select('id').in('id', screenshotIds).eq('user_id', userId).eq('storage_status', 'stored');
    if (ownershipError || owned?.length !== screenshotIds.length) return { isError: true, content: [text({ error: 'One or more screenshots were not found.' })] };
    const analyzedAt = new Date().toISOString();
    const updates = await Promise.all(analyses.map(({ screenshotId, description }) => admin.from('screenshots').update({ analysis_description: description, analysis_provider: 'CODEX_MCP', analysis_status: 'COMPLETED', analyzed_at: analyzedAt }).eq('id', screenshotId).eq('user_id', userId).eq('storage_status', 'stored').select('id').maybeSingle()));
    if (updates.some(({ data, error }) => error || !data)) return { isError: true, content: [text({ error: 'Unable to save one or more screenshot descriptions.' })] };
    const result = analyses.length === 1 ? { screenshotId: screenshotIds[0], saved: true } : { screenshotIds, saved: true };
    return { content: [text(result)], structuredContent: result };
  });
  return server;
}
