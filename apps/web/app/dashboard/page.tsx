import { AppNav } from '@/src/components/app-nav';
import { ScreenshotGallery } from '@/src/components/screenshot-gallery';
import { UploadScreenshotForm } from '@/src/components/upload-screenshot-form';
import { FolderManager } from '@/src/components/folder-manager';
import { requireUser } from '@/src/lib/auth';
import { listUserScreenshotFolders } from '@/src/lib/folders';
import {
  listUserScreenshots,
  type ScreenshotView
} from '@/src/lib/screenshots';

type DashboardSearch = { view?: string; folder?: string; page?: string };

export default async function Dashboard({
  searchParams
}: {
  searchParams: Promise<DashboardSearch>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const library = await listUserScreenshotFolders(user.id);
  const folders = library.folders;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const selectedFolder =
    params.view === 'folder'
      ? folders.find((folder) => folder.id === params.folder)
      : undefined;
  const defaultFolder = folders.find((folder) => folder.is_default);
  const view: ScreenshotView | null =
    params.view === 'all'
      ? { kind: 'all' }
      : params.view === 'unfiled' && defaultFolder
        ? { kind: 'folder', folderId: defaultFolder.id }
        : selectedFolder
          ? { kind: 'folder', folderId: selectedFolder.id }
          : null;
  const screenshots = view
    ? await listUserScreenshots(user.id, view, page)
    : { screenshots: [], hasMore: false };
  return (
    <main className="shell">
      <AppNav email={user.email} />
      <header className="header">
        <div>
          <p className="brand">PRIVATE TIMELINE</p>
          <h1>Your screenshots</h1>
          <p className="muted">
            Browse one collection at a time. Images are served with short-lived
            private links.
          </p>
        </div>
        <UploadScreenshotForm
          folders={folders.filter((folder) => !folder.is_default)}
        />
      </header>
      <div className="dashboard-layout">
        <FolderManager
          folders={folders}
          selectedView={view}
          unfiledCount={library.unfiledCount}
          totalCount={library.totalCount}
        />
        <div className="stack">
          <ScreenshotGallery
            userId={user.id}
            screenshots={screenshots.screenshots}
            folders={folders}
            selectedView={view}
            selectedFolder={
              view?.kind === 'folder'
                ? folders.find((folder) => folder.id === view.folderId)
                : undefined
            }
            page={page}
            hasMore={screenshots.hasMore}
            totalCount={library.totalCount}
          />
        </div>
      </div>
    </main>
  );
}
