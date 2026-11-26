'use client';

import { useActionState, useState } from 'react';
import {
  saveScreenshotNotes,
  type NotesState
} from '@/app/screenshots/[id]/actions';
import { CopyTextButton } from '@/src/components/copy-text-button';

const initialState: NotesState = {};

export function ScreenshotNotesForm({
  screenshotId,
  notes,
  onSaved
}: {
  screenshotId: string;
  notes: string | null;
  onSaved?: (notes: string | null) => void;
}) {
  const [draft, setDraft] = useState(notes ?? '');
  const [state, action, pending] = useActionState(
    async (previous: NotesState, formData: FormData) => {
      const result = await saveScreenshotNotes(previous, formData);
      if (result.success)
        onSaved?.(String(formData.get('notes') ?? '').trim() || null);
      return result;
    },
    initialState
  );
  return (
    <form action={action} className="notes-form">
      <input name="screenshotId" type="hidden" value={screenshotId} />
      <div className="screenshot-section-heading">
        <label htmlFor="screenshot-notes">Additional notes</label>
        <CopyTextButton text={draft} label="additional notes" />
      </div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        id="screenshot-notes"
        name="notes"
        placeholder="Write additional context about this screenshot…"
        rows={5}
        maxLength={10000}
      />
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save notes'}
        </button>
        <span role="status">
          {state.error && <span className="error">{state.error}</span>}
          {state.success && <span className="flash">{state.success}</span>}
        </span>
      </div>
    </form>
  );
}
