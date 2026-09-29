'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { uploadScreenshot, type UploadScreenshotState } from '@/app/dashboard/actions';

const initialState: UploadScreenshotState = {};

export function UploadScreenshotForm() {
  const [state, action, pending] = useActionState(uploadScreenshot, initialState);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (state.success) {
      form.current?.reset();
      setFileName('');
      setSelectedFile(null);
      setIsOpen(false);
    }
  }, [state.success]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, pending]);

  function close() {
    if (!pending) setIsOpen(false);
  }

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setFileName(file?.name ?? '');
  }

  return <>
    <button className="secondary add-screenshot-trigger" type="button" onClick={() => setIsOpen(true)}>
      <span aria-hidden="true">+</span> Add screenshot
    </button>

    {isOpen && <div className="upload-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-screenshot-title">
        <div className="upload-modal-header">
          <div>
            <p className="upload-kicker">Manual upload</p>
            <h2 id="upload-screenshot-title">Add a screenshot</h2>
            <p>Keep a one-off capture with your private timeline.</p>
          </div>
          <button className="modal-close" type="button" onClick={close} disabled={pending} aria-label="Close add screenshot dialog">×</button>
        </div>
        <form ref={form} className="upload-form" action={action}>
          <input ref={fileInput} id="screenshot-upload" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required disabled={pending} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
          <button className={`file-picker${previewUrl ? ' has-preview' : ''}`} type="button" onClick={() => fileInput.current?.click()} disabled={pending}>
            {previewUrl && <span className="file-preview"><img src={previewUrl} alt={`Preview of ${fileName}`} /></span>}
            <span className="file-picker-icon" aria-hidden="true">↑</span>
            <span>{fileName || 'Choose an image'}</span>
            <small>{fileName ? 'Preview ready · Click to replace' : 'JPEG, PNG, or WebP · 5 MB max'}</small>
          </button>
          <div className="upload-modal-actions">
            <button className="secondary" type="button" onClick={close} disabled={pending}>Cancel</button>
            <button type="submit" disabled={pending || !fileName}>{pending ? 'Uploading…' : 'Upload screenshot'}</button>
          </div>
        </form>
        <p className={state.error ? 'error upload-message' : 'flash upload-message'} aria-live="polite">{state.error || state.success || ''}</p>
      </section>
    </div>}
  </>;
}
