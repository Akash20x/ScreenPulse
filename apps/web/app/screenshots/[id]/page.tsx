import { notFound } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { loadScreenshotContext } from '@/src/lib/screenshot-context';
import { ScreenshotDetailViewer } from '@/src/components/screenshot-detail-viewer';

type DetailSearch = {
  view?: string;
  folder?: string;
  page?: string;
  mode?: string;
};

export default async function ScreenshotDetail({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<DetailSearch>;
}) {
  const { id } = await params;
  const context = await searchParams;
  const user = await requireUser();
  const view =
    context.view === 'folder' && context.folder
      ? { kind: 'folder' as const, folderId: context.folder }
      : context.view === 'unfiled'
        ? { kind: 'unfiled' as const }
        : { kind: 'all' as const };
  const screenshotContext = await loadScreenshotContext(user.id, id, view);
  if (!screenshotContext) notFound();
  const page = Math.max(0, Number.parseInt(context.page ?? '0', 10) || 0);
  return (
    <ScreenshotDetailViewer
      initialContext={screenshotContext}
      view={view}
      page={page}
      imageOnly={context.mode === 'image'}
      email={user.email ?? ''}
      userId={user.id}
    />
  );
}
