'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScreenshotFolder } from '@/src/lib/folders';
import { MAX_BATCH_UPLOADS, validateBatchFiles, splitUploadBatches, findDuplicateNames } from '@/src/lib/manual-upload';

type Item = { file: File; status: 'waiting' | 'uploading' | 'success' | 'failed'; error?: string };

export function UploadScreenshotForm({ folders }: { folders: ScreenshotFolder[] }) {
  const router = useRouter(); const fileInput = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false); const [files, setFiles] = useState<File[]>([]); const [folderId, setFolderId] = useState('');
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [duplicates, setDuplicates] = useState<File[] | null>(null);
  const [items, setItems] = useState<Item[]>([]); const [completed, setCompleted] = useState(false);
  useEffect(() => { if (!isOpen) return; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) setIsOpen(false); }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [isOpen, pending]);
  function choose(next: File[]) { setError(validateBatchFiles(next) ?? ''); setCompleted(false); setDuplicates(null); setItems([]); setFiles(next); }
  async function runBatch(batch: Item[]) {
    await Promise.all(batch.map(async (item) => {
      setItems((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: 'uploading', error: undefined } : entry));
      const form = new FormData(); form.append('screenshot', item.file); if (folderId) form.append('folderId', folderId);
      let error: string | undefined;
      try { const response = await fetch('/api/dashboard/uploads', { method: 'POST', body: form }); const data = await response.json().catch(() => ({})); if (!response.ok) error = data.error || 'Upload failed.'; } catch { error = 'Network error while uploading.'; }
      setItems((current) => current.map((entry) => entry.file === item.file ? { ...entry, status: error ? 'failed' : 'success', error } : entry));
      return !error;
    }));
  }
  async function startUpload(accepted: File[]) {
    const next = accepted.map((file): Item => ({ file, status: 'waiting' })); setItems(next); setDuplicates(null); setError(''); setPending(true);
    for (const batch of splitUploadBatches(next)) await runBatch(batch);
    setPending(false); router.refresh();
  }
  async function checkAndUpload() {
    if (!folderId) { setError('Choose a folder first.'); return; }
    const validation = validateBatchFiles(files); if (validation) { setError(validation); return; }
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/dashboard/uploads?folderId=${encodeURIComponent(folderId)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not check duplicates.');
      const flags = findDuplicateNames(files.map((file) => file.name), data.names); const matches = files.filter((_, index) => flags[index]);
      if (matches.length) { setDuplicates(matches); setPending(false); return; }
      await startUpload(files);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not check duplicates.'); setPending(false); }
  }
  async function retry(batch: Item[]) { setPending(true); await runBatch(batch.filter((item) => item.status === 'failed')); setPending(false); router.refresh(); }
  const batches = splitUploadBatches(items); const finished = items.length > 0 && items.every((item) => item.status === 'success' || item.status === 'failed');
  useEffect(() => { if (!pending && finished && items.every((item) => item.status === 'success')) setCompleted(true); }, [pending, finished, items]);
  function reset() { setIsOpen(false); setFiles([]); setItems([]); setDuplicates(null); setError(''); setCompleted(false); if (fileInput.current) fileInput.current.value = ''; }
  return <><button className="secondary add-screenshot-trigger" type="button" onClick={() => setIsOpen(true)}><span aria-hidden="true">+</span> Add screenshots</button>
    {isOpen && <div className="upload-backdrop" role="presentation"><section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-screenshot-title">
      <div className="upload-modal-header"><div><p className="upload-kicker">Manual upload</p><h2 id="upload-screenshot-title">Add screenshots</h2><p>Choose up to 50 images for one folder.</p></div><button className="modal-close" type="button" onClick={reset} disabled={pending} aria-label="Close add screenshots dialog">×</button></div>
      {!items.length && !duplicates && <div className="upload-form"><input ref={fileInput} id="screenshot-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={pending} onChange={(event) => choose(Array.from(event.target.files ?? []))} /><button className="file-picker" type="button" onClick={() => fileInput.current?.click()} disabled={pending}><span className="file-picker-icon" aria-hidden="true">↑</span><span>{files.length ? `${files.length} images selected` : 'Choose images'}</span><small>JPEG, PNG, or WebP · 5 MB each · {MAX_BATCH_UPLOADS} max</small></button><label>Folder<select value={folderId} onChange={(event) => setFolderId(event.target.value)} disabled={pending}><option value="">Choose a folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><div className="upload-modal-actions"><button className="secondary" type="button" onClick={reset} disabled={pending}>Cancel</button><button type="button" onClick={() => void checkAndUpload()} disabled={pending || !files.length || !folderId}>{pending ? 'Checking…' : `Upload ${files.length || ''} screenshots`}</button></div></div>}
      {duplicates && <div className="upload-results" role="alert"><strong>{duplicates.length} duplicate screenshot{duplicates.length === 1 ? '' : 's'} found</strong><p>These filenames already exist in this folder or were selected more than once:</p>{duplicates.map((file, index) => <p key={index}>{file.name}</p>)}<div className="upload-modal-actions"><button className="secondary" type="button" onClick={() => setDuplicates(null)}>Choose again</button>{duplicates.length < files.length && <button type="button" onClick={() => void startUpload(files.filter((file) => !duplicates.includes(file)))}>Omit duplicates and upload</button>}</div>{duplicates.length === files.length && <p>Choose other files to upload.</p>}</div>}
      {error && <p className="error upload-message" role="alert">{error}</p>}
      {items.length > 0 && <div className="upload-results" aria-live="polite"><strong>{completed ? 'Upload complete' : `${items.filter((item) => item.status === 'success').length} of ${items.length} uploaded`}</strong>{batches.map((batch, index) => <div key={index}><strong>Batch {index + 1} of {batches.length}</strong>{batch.map((item, itemIndex) => <p className={item.error ? 'error' : 'muted'} key={itemIndex}>{item.file.name} — {item.error || item.status}</p>)}{batch.some((item) => item.status === 'failed') && <button type="button" className="secondary" disabled={pending} onClick={() => void retry(batch)}>Retry failed</button>}</div>)}{finished && <button type="button" onClick={reset}>Done</button>}</div>}
    </section></div>}</>;
}
