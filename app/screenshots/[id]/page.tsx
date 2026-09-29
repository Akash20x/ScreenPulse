import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppNav } from '@/src/components/app-nav';
import { ScreenshotNarrator } from '@/src/components/screenshot-narrator';
import { deleteScreenshot } from './actions';
import { requireUser } from '@/src/lib/auth';
import { createAdminClient } from '@/src/lib/supabase/admin';

export default async function ScreenshotDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: screenshot } = await admin.from('screenshots').select('id,page_url,page_title,captured_at,storage_path,analysis_description,analysis_provider,analysis_status,analyzed_at').eq('id', id).eq('user_id', user.id).eq('storage_status', 'stored').maybeSingle();
  if (!screenshot) notFound();
  const { data: signed, error } = await admin.storage.from('screenshots').createSignedUrl(screenshot.storage_path, 60 * 10);
  if (error) throw error;
  const domain = new URL(screenshot.page_url).hostname;
  return <main className="shell"><AppNav email={user.email} /><p><Link href="/dashboard">← Back to gallery</Link></p><article className="panel"><img className="detail-image" src={signed.signedUrl} alt={`Screenshot from ${screenshot.page_title || domain}`} /><div className="detail-meta"><h1>{screenshot.page_title || domain}</h1><a href={screenshot.page_url} rel="noreferrer" target="_blank">{domain}</a><time className="muted" dateTime={screenshot.captured_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'medium' }).format(new Date(screenshot.captured_at))}</time></div><section className="analysis"><h2>Codex analysis</h2><ScreenshotNarrator screenshot={screenshot} />{screenshot.analysis_description && screenshot.analysis_provider === 'CODEX_MCP' && <p className="muted">Analyzed by Codex{ screenshot.analyzed_at ? ` on ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(screenshot.analyzed_at))}` : '' }.</p>}</section><form action={deleteScreenshot}><input name="screenshotId" type="hidden" value={screenshot.id} /><button className="danger" type="submit">Delete permanently</button></form></article></main>;
}
