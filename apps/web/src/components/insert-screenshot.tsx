'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconDotsVertical } from '@tabler/icons-react';
import { validateBatchFiles } from '@/src/lib/manual-upload';
import { ShareScreenshotDialog } from '@/src/components/share-screenshot-dialog';

export function InsertScreenshot({
  folderId,
  screenshotId
}: {
  folderId?: string;
  screenshotId: string;
}) {
  const [position, setPosition] = useState<'before' | 'after' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  useEffect(() => {
    if (!position) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) setPosition(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [position, pending]);
  function open(next: 'before' | 'after') {
    if (details.current) details.current.open = false;
    setFile(null);
    setError('');
    setPosition(next);
  }
  async function upload() {
    if (!file || !position || !folderId) return;
    const validation = validateBatchFiles([file]);
    if (validation) {
      setError(validation);
      return;
    }
    setPending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('screenshot', file);
      form.append('folderId', folderId);
      form.append('referenceId', screenshotId);
      form.append('position', position);
      const response = await fetch('/api/dashboard/uploads', {
        method: 'POST',
        body: form
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || 'Could not upload screenshot.');
      setPosition(null);
      router.push(
        `/dashboard?view=folder&folder=${encodeURIComponent(folderId)}&page=${result.page ?? 0}`
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not upload screenshot.'
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <details className="screenshot-menu" ref={details}>
        <summary aria-label="Screenshot options">
          <IconDotsVertical size={20} aria-hidden="true" />
        </summary>
        <div className="screenshot-menu-popup">
          {folderId && (
            <>
              <button type="button" onClick={() => open('before')}>
                Add screenshot before
              </button>
              <button type="button" onClick={() => open('after')}>
                Add screenshot after
              </button>
            </>
          )}
          <a
            href={`/api/screenshots/${encodeURIComponent(screenshotId)}/download`}
            download
            onClick={() => {
              if (details.current) details.current.open = false;
            }}
          >
            Download image
          </a>
          <button
            type="button"
            onClick={() => {
              if (details.current) details.current.open = false;
              setSharing(true);
            }}
          >
            Create share link
          </button>
        </div>
      </details>
      {sharing && (
        <ShareScreenshotDialog
          screenshotId={screenshotId}
          onClose={() => setSharing(false)}
        />
      )}
      {position && (
        <div className="upload-backdrop">
          <section
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insert-screenshot-title"
          >
            <div className="upload-modal-header">
              <div>
                <p className="upload-kicker">Manual upload</p>
                <h2 id="insert-screenshot-title">Add screenshot {position}</h2>
                <p>Choose one image to add to this folder.</p>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setPosition(null)}
                disabled={pending}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="upload-form">
              <label>
                Choose image
                <input
                  className="insert-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={pending}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setError('');
                  }}
                />
              </label>
              <p className="muted">JPEG, PNG or WebP · up to 5 MB</p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="upload-modal-actions">
                <button
                  className="secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => setPosition(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!file || pending}
                  onClick={() => void upload()}
                >
                  {pending ? 'Uploading…' : 'Upload screenshot'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
