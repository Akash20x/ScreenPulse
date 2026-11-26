'use client';

import { useRef, useState, type FormEvent } from 'react';
import { IconPencil } from '@tabler/icons-react';
import { renameScreenshot } from '@/app/screenshots/[id]/actions';

export function ScreenshotTitleEditor({
  screenshotId,
  name,
  onSaved
}: {
  screenshotId: string;
  name: string;
  onSaved: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  function close() {
    setEditing(false);
    setError('');
    requestAnimationFrame(() => editButton.current?.focus());
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await renameScreenshot(formData);
      if (result.error || !result.name) {
        setError(result.error ?? 'Could not save the name.');
        return;
      }
      onSaved(result.name);
      setSaved(true);
      close();
    } catch {
      setError('Could not save the name. Please try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="screenshot-title-editor">
      {editing ? (
        <form
          className="screenshot-name-form"
          onSubmit={(event) => void save(event)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !pending) {
              event.preventDefault();
              close();
            }
          }}
        >
          <input type="hidden" name="screenshotId" value={screenshotId} />
          <label htmlFor={`screenshot-name-${screenshotId}`}>
            Screenshot name
            <input
              autoFocus
              id={`screenshot-name-${screenshotId}`}
              name="name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={255}
              required
              disabled={pending}
              aria-describedby={
                error ? `name-error-${screenshotId}` : undefined
              }
              aria-invalid={!!error}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={pending || !draft.trim()}>
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="error" id={`name-error-${screenshotId}`} role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="screenshot-title-row">
          <h1 title={name}>{name}</h1>
          <button
            ref={editButton}
            className="secondary icon-button screenshot-rename-button"
            type="button"
            title="Edit screenshot name"
            aria-label="Edit screenshot name"
            onClick={() => {
              setDraft(name);
              setError('');
              setSaved(false);
              setEditing(true);
            }}
          >
            <IconPencil size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      <span className="muted screenshot-name-status" role="status">
        {saved ? 'Name saved.' : ''}
      </span>
    </div>
  );
}
