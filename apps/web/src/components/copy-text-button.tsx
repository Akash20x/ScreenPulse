'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function CopyTextButton({
  text,
  label
}: {
  text: string | null | undefined;
  label: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setStatus('idle');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);
  if (!text?.trim()) return null;
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text!);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500);
  }
  return (
    <span className="copy-text-control">
      <button
        className="secondary icon-button text-copy-button"
        type="button"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        onClick={() => void copy()}
      >
        {status === 'copied' ? (
          <IconCheck size={20} aria-hidden="true" />
        ) : (
          <IconCopy size={20} aria-hidden="true" />
        )}
      </button>
      <span
        className={
          status === 'error' ? 'copy-text-feedback error' : 'copy-text-feedback'
        }
        role="status"
      >
        {status === 'copied'
          ? 'Copied'
          : status === 'error'
            ? 'Could not copy. Try again.'
            : ''}
      </span>
    </span>
  );
}
