'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLayoutGrid, IconList, IconTrash } from '@tabler/icons-react';
import type { ScreenshotFolder } from '@/src/lib/folders';
import type { GalleryScreenshot, ScreenshotView } from '@/src/lib/screenshots';
import { formatCaptureTime } from '@/src/lib/slideshow';
import { NarrationControls } from '@/src/components/screenshot-narrator';
import { ViewerScreenshotImage as CachedScreenshotImage } from '@/src/components/viewer-screenshot-image';
import { InsertScreenshot } from '@/src/components/insert-screenshot';
import { CopyTextButton } from '@/src/components/copy-text-button';
import {
  screenshotDisplayTitle,
  screenshotSourceDomain
} from '@/src/lib/screenshot-labels';
import { prefetchScreenshotSessionImages } from '@/src/lib/screenshot-session-cache';

function viewQuery(view: ScreenshotView, page = 0) {
  const base =
    view.kind === 'folder'
      ? `view=folder&folder=${encodeURIComponent(view.folderId ?? '')}`
      : `view=${view.kind}`;
  return `${base}&page=${page}`;
}

export function ScreenshotGallery({
  userId,
  screenshots,
  selectedView,
  selectedFolder,
  page,
  hasMore,
  totalCount
}: {
  userId: string;
  screenshots: GalleryScreenshot[];
  folders: ScreenshotFolder[];
  selectedView: ScreenshotView | null;
  selectedFolder?: ScreenshotFolder;
  page: number;
  hasMore: boolean;
  totalCount: number;
}) {
  if (!selectedView)
    return (
      <section className="panel library-empty">
        <p className="brand">YOUR LIBRARY</p>
        <h2>Select a collection</h2>
        <p className="muted">
          Choose a folder, Unfiled, or All screenshots from the library panel.
          This keeps large screenshot libraries fast and easy to scan.
        </p>
        <div className="library-stat">
          <strong>{totalCount}</strong>
          <span>screenshots ready to browse</span>
        </div>
      </section>
    );
  const label =
    selectedView.kind === 'folder'
      ? (selectedFolder?.name ?? 'Folder')
      : selectedView.kind === 'unfiled'
        ? 'Unfiled'
        : 'All screenshots';
  if (!screenshots.length)
    return (
      <section className="panel library-empty">
        <p className="brand">{label.toUpperCase()}</p>
        <h2>No screenshots here yet</h2>
        <p className="muted">
          Choose another collection or add screenshots to this folder.
        </p>
      </section>
    );
  return (
    <GalleryWithSlideshow
      userId={userId}
      screenshots={screenshots}
      label={label}
      query={viewQuery(selectedView, page)}
      page={page}
      hasMore={hasMore}
      folderId={
        selectedView.kind === 'folder' ? selectedView.folderId : undefined
      }
      folderCount={selectedFolder?.screenshotCount}
      isDefault={selectedFolder?.is_default}
    />
  );
}

function GalleryWithSlideshow({
  userId,
  screenshots,
  label,
  query,
  page,
  hasMore,
  folderId,
  folderCount,
  isDefault
}: {
  userId: string;
  screenshots: GalleryScreenshot[];
  label: string;
  query: string;
  page: number;
  hasMore: boolean;
  folderId?: string;
  folderCount?: number;
  isDefault?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [continueNotes, setContinueNotes] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteMode, setDeleteMode] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmMode, setConfirmMode] = useState<'selected' | 'all' | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cacheProgress, setCacheProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const router = useRouter();
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const screenshot = screenshots[index];
  useEffect(() => {
    const saved = window.localStorage.getItem('screenpulse-gallery-view');
    if (saved === 'list' || saved === 'grid') setViewMode(saved);
  }, []);
  useEffect(() => {
    setDeleteMode(false);
    setAllSelected(false);
    setSelectedIds([]);
    setDeleteError('');
  }, [folderId, page]);
  useEffect(() => {
    if (isOpen) closeButton.current?.focus();
  }, [isOpen]);
  useEffect(() => {
    if (!deleteMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        setDeleteMode(false);
        setAllSelected(false);
        setSelectedIds([]);
        setDeleteError('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteMode, deleting]);
  useEffect(() => {
    let active = true;
    const ids = screenshots.map((item) => item.id);
    setCacheProgress({ completed: 0, total: ids.length });
    void prefetchScreenshotSessionImages(userId, ids, {
      concurrency: 3,
      onProgress: (completed, total) => {
        if (active) setCacheProgress({ completed, total });
      }
    });
    return () => {
      active = false;
    };
  }, [screenshots, userId]);
  const close = () => {
    setContinueNotes(false);
    setIsOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const previous = () => setIndex((value) => Math.max(0, value - 1));
  const next = () =>
    setIndex((value) => Math.min(screenshots.length - 1, value + 1));
  useEffect(() => {
    if (!isOpen) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  useEffect(() => {
    if (
      !isOpen ||
      screenshot.user_notes?.trim() ||
      index >= screenshots.length - 1
    )
      return;
    const timer = window.setTimeout(next, 5000);
    return () => window.clearTimeout(timer);
  }, [index, isOpen, screenshot.user_notes]);
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const end = event.changedTouches[0];
    const dx = (end?.clientX ?? start.x) - start.x;
    const dy = (end?.clientY ?? start.y) - start.y;
    if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy))
      dx < 0 ? next() : previous();
  };
  const changeView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    window.localStorage.setItem('screenpulse-gallery-view', mode);
  };
  const enterDeleteMode = () => {
    setDeleteError('');
    setAllSelected(false);
    setSelectedIds([]);
    setDeleteMode(true);
  };
  const exitDeleteMode = () => {
    if (deleting) return;
    setConfirmMode(null);
    setAllSelected(false);
    setSelectedIds([]);
    setDeleteError('');
    setDeleteMode(false);
  };
  const toggleSelected = (id: string) => {
    if (allSelected) {
      setAllSelected(false);
      setSelectedIds(
        screenshots.filter((shot) => shot.id !== id).map((shot) => shot.id)
      );
      return;
    }
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };
  const toggleSelectAll = () => {
    setAllSelected((current) => !current);
    setSelectedIds([]);
  };
  const deleteImages = async () => {
    if (!folderId || !confirmMode) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const deleteAll =
        confirmMode === 'all' || (confirmMode === 'selected' && allSelected);
      const response = await fetch(
        '/api/dashboard/folders/delete-screenshots',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId,
            screenshotIds: deleteAll ? undefined : selectedIds,
            deleteAll
          })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || 'Could not delete screenshots.');
      setConfirmMode(null);
      setAllSelected(false);
      setSelectedIds([]);
      setDeleteMode(false);
      if (data.folderRemoved) router.replace('/dashboard');
      else router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Could not delete screenshots.'
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div>
      {cacheProgress &&
        cacheProgress.total > 0 &&
        cacheProgress.completed < cacheProgress.total && (
          <p className="image-cache-progress" role="status">
            Preparing images for smooth viewing… {cacheProgress.completed}/
            {cacheProgress.total}
          </p>
        )}
      <div className="gallery-toolbar">
        <div>
          <p className="brand">{label.toUpperCase()}</p>
          <p className="muted">
            {screenshots.length} screenshot{screenshots.length === 1 ? '' : 's'}{' '}
            on this page
          </p>
        </div>
        <div className="gallery-toolbar-actions">
          <div
            className="view-toggle"
            role="group"
            aria-label="Screenshot layout"
          >
            <button
              className={viewMode === 'grid' ? 'selected-view' : ''}
              type="button"
              onClick={() => changeView('grid')}
              aria-label="Large image grid"
              aria-pressed={viewMode === 'grid'}
              title="Large image grid"
            >
              <IconLayoutGrid aria-hidden="true" size={20} />
            </button>
            <button
              className={viewMode === 'list' ? 'selected-view' : ''}
              type="button"
              onClick={() => changeView('list')}
              aria-label="Compact list"
              aria-pressed={viewMode === 'list'}
              title="Compact list"
            >
              <IconList aria-hidden="true" size={20} />
            </button>
          </div>
          {!deleteMode && (
            <>
              <button
                ref={opener}
                type="button"
                onClick={() => {
                  setIndex(0);
                  setContinueNotes(false);
                  setIsOpen(true);
                }}
              >
                Start slideshow
              </button>
              {folderId && (
                <button
                  className="secondary icon-button"
                  type="button"
                  onClick={enterDeleteMode}
                  aria-label="Select screenshots to delete"
                  title="Select screenshots to delete"
                >
                  <IconTrash aria-hidden="true" size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {deleteMode && (
        <div className="folder-bulk-toolbar" aria-label="Delete mode">
          <div className="folder-bulk-summary">
            <label className="select-all-control">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />{' '}
              <span>Select all</span>
            </label>
            <strong>
              {allSelected
                ? `All ${folderCount ?? ''} selected`
                : selectedIds.length
                  ? `${selectedIds.length} selected`
                  : 'Select screenshots'}
            </strong>
          </div>
          <button
            className="danger small-button folder-delete-all"
            type="button"
            onClick={() => setConfirmMode('all')}
          >
            <IconTrash aria-hidden="true" size={16} /> Delete All
          </button>
          <div className="folder-bulk-primary">
            <button
              className="secondary"
              type="button"
              onClick={exitDeleteMode}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="danger"
              type="button"
              disabled={(!allSelected && !selectedIds.length) || deleting}
              onClick={() => setConfirmMode('selected')}
            >
              <IconTrash aria-hidden="true" size={16} /> Delete selected
            </button>
          </div>
        </div>
      )}
      {deleteError && <p className="error">{deleteError}</p>}
      <section
        className={viewMode === 'list' ? 'gallery gallery-list' : 'gallery'}
        aria-label={`${label} screenshots`}
      >
        {screenshots.map((shot, shotIndex) => (
          <article
            className={`${viewMode === 'list' ? 'card card-list' : 'card'}${deleteMode && (allSelected || selectedIds.includes(shot.id)) ? ' selected-card' : ''}`}
            key={shot.id}
          >
            {deleteMode && (
              <label className="screenshot-select">
                <input
                  type="checkbox"
                  checked={allSelected || selectedIds.includes(shot.id)}
                  onChange={() => toggleSelected(shot.id)}
                  aria-label={`Select ${screenshotDisplayTitle(shot.page_title, shot.page_url)}`}
                />
              </label>
            )}
            {!deleteMode && (
              <InsertScreenshot
                folderId={!isDefault ? folderId : undefined}
                screenshotId={shot.id}
              />
            )}
            <Link href={`/screenshots/${shot.id}?${query}&index=${shotIndex}`}>
              <CachedScreenshotImage
                userId={userId}
                screenshotId={shot.id}
                sourceUrl={shot.imageUrl}
                alt={`Screenshot from ${screenshotDisplayTitle(shot.page_title, shot.page_url)}`}
                className="thumb"
              />
            </Link>
            <div className="card-body">
              <Link
                className="card-title"
                title={screenshotDisplayTitle(shot.page_title, shot.page_url)}
                href={`/screenshots/${shot.id}?${query}&index=${shotIndex}`}
              >
                {screenshotDisplayTitle(shot.page_title, shot.page_url)}
              </Link>
              {screenshotSourceDomain(shot.page_url) && (
                <span
                  className="muted card-domain"
                  title={screenshotSourceDomain(shot.page_url) ?? undefined}
                >
                  {screenshotSourceDomain(shot.page_url)}
                </span>
              )}
              <time className="muted" dateTime={shot.captured_at}>
                {formatCaptureTime(shot.captured_at)}
              </time>
            </div>
          </article>
        ))}
      </section>
      <nav className="pagination" aria-label="Screenshot pages">
        {page > 0 && (
          <Link
            className="secondary"
            href={`/dashboard?${query.replace(`page=${page}`, `page=${page - 1}`)}`}
          >
            Newer
          </Link>
        )}
        {hasMore && (
          <Link
            className="secondary"
            href={`/dashboard?${query.replace(`page=${page}`, `page=${page + 1}`)}`}
          >
            Older
          </Link>
        )}
      </nav>
      {confirmMode && (
        <div className="delete-backdrop" role="presentation">
          <section
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-folder-screenshots"
          >
            <p className="brand">PERMANENT DELETE</p>
            <h2 id="delete-folder-screenshots">
              {confirmMode === 'all' || allSelected
                ? `Delete all ${folderCount ?? ''} screenshots?`
                : `Delete ${selectedIds.length} selected screenshot${selectedIds.length === 1 ? '' : 's'}?`}
            </h2>
            <p>
              This cannot be undone. The private image files and saved notes
              will be removed. If this is the final image, the empty folder will
              also be removed.
            </p>
            {deleteError && <p className="error">{deleteError}</p>}
            <div className="delete-dialog-actions">
              <button
                className="secondary"
                type="button"
                disabled={deleting}
                onClick={() => {
                  setConfirmMode(null);
                  setDeleteError('');
                }}
              >
                Cancel
              </button>
              <button
                className="danger"
                type="button"
                disabled={deleting}
                onClick={() => void deleteImages()}
              >
                {deleting
                  ? 'Deleting…'
                  : confirmMode === 'all' || allSelected
                    ? 'Delete all screenshots'
                    : 'Delete selected screenshots'}
              </button>
            </div>
          </section>
        </div>
      )}
      {isOpen && (
        <div
          className="slideshow-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            className="slideshow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slideshow-title"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              touchStart.current = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null;
            }}
            onTouchEnd={onTouchEnd}
          >
            <header className="slideshow-header">
              <p className="muted">
                Screenshot {index + 1} of {screenshots.length}
              </p>
              <button
                ref={closeButton}
                type="button"
                className="secondary"
                onClick={close}
              >
                Close
              </button>
            </header>
            <CachedScreenshotImage
              userId={userId}
              screenshotId={screenshot.id}
              sourceUrl={screenshot.imageUrl}
              className="slideshow-image"
              alt={`Screenshot from ${screenshotDisplayTitle(screenshot.page_title, screenshot.page_url)}`}
            />
            <div className="slideshow-content">
              <h2 id="slideshow-title">
                {screenshotDisplayTitle(
                  screenshot.page_title,
                  screenshot.page_url
                )}
              </h2>
              {screenshot.analysis_description?.trim() && (
                <section className="slideshow-copy">
                  <div className="screenshot-section-heading">
                    <h3>
                      {screenshot.analysis_provider === 'CODEX_MCP'
                        ? 'Codex analysis'
                        : 'AI analysis'}
                    </h3>
                    <CopyTextButton
                      text={screenshot.analysis_description}
                      label="AI analysis"
                    />
                  </div>
                  <p>{screenshot.analysis_description}</p>
                  <NarrationControls
                    key={`analysis-${screenshot.id}`}
                    text={screenshot.analysis_description}
                    label="analysis"
                  />
                </section>
              )}
              {screenshot.user_notes?.trim() && (
                <section className="slideshow-copy">
                  <div className="screenshot-section-heading">
                    <h3>Additional notes</h3>
                    <CopyTextButton
                      text={screenshot.user_notes}
                      label="additional notes"
                    />
                  </div>
                  <p>{screenshot.user_notes}</p>
                  <NarrationControls
                    key={`notes-${screenshot.id}`}
                    text={screenshot.user_notes}
                    label="notes"
                    autoPlay={continueNotes}
                    onStart={() => setContinueNotes(true)}
                    onStop={() => setContinueNotes(false)}
                    onComplete={() => {
                      if (index < screenshots.length - 1) next();
                    }}
                  />
                </section>
              )}
              <div className="slideshow-controls">
                <button
                  type="button"
                  className="secondary"
                  onClick={previous}
                  disabled={index === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={next}
                  disabled={index === screenshots.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
