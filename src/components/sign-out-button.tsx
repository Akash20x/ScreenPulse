'use client';

import { clearScreenshotImageCache } from '@/src/lib/screenshot-image-cache';

export function SignOutButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return <form action={async (formData) => { await clearScreenshotImageCache(); await action(formData); }}><button className="secondary" type="submit">Sign out</button></form>;
}
