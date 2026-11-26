'use client';

import { clearScreenshotSessionCache } from '@/src/lib/screenshot-session-cache';

export function SignOutButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return <form action={async (formData) => { await clearScreenshotSessionCache(); await action(formData); }}><button className="secondary" type="submit">Sign out</button></form>;
}
