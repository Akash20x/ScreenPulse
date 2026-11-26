'use client';

import { useEffect, useRef, useState } from 'react';
import { invalidateScreenshotImage, loadScreenshotImage, screenshotImageFallbackPath } from '@/src/lib/screenshot-image-cache';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { userId: string; screenshotId: string; sourceUrl: string; showStatus?: boolean };

export function CachedScreenshotImage({ userId, screenshotId, sourceUrl, showStatus = false, onError, ...props }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let active = true;
    retries.current = 0;
    setSrc(null);
    setFailed(false);
    void loadScreenshotImage(userId, screenshotId, sourceUrl).then(async (url) => {
      // A fetched blob is not necessarily decoded yet, especially on mobile.
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
        if (active) setSrc(url);
      } catch {
        if (active) setSrc(screenshotImageFallbackPath(screenshotId));
      }
    }).catch(() => { if (active) setSrc(screenshotImageFallbackPath(screenshotId)); });
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [screenshotId, sourceUrl, userId]);
  return <><img {...props} src={src ?? undefined} onError={(event) => {
    if (!src) return;
    if (retries.current >= 2) { setFailed(true); onError?.(event); return; }
    retries.current += 1;
    const attempt = retries.current;
    void invalidateScreenshotImage(userId, screenshotId);
    timer.current = setTimeout(() => setSrc(`${screenshotImageFallbackPath(screenshotId)}?retry=${attempt}`), attempt * 400);
  }} />{showStatus && !src && <span className="screenshot-image-loading" role="status" aria-label="Loading screenshot" />}{showStatus && failed && <span className="screenshot-image-error" role="alert">Image unavailable. Try reopening this screenshot.</span>}</>;
}
