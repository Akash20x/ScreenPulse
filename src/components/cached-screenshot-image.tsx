'use client';

import { useEffect, useRef, useState } from 'react';
import { invalidateScreenshotImage, loadScreenshotImage, retainScreenshotImage, screenshotImageFallbackPath } from '@/src/lib/screenshot-image-cache';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { userId: string; screenshotId: string; sourceUrl: string; showStatus?: boolean };

export function CachedScreenshotImage({ userId, screenshotId, sourceUrl, showStatus = false, onError, ...props }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  useEffect(() => {
    let active = true;
    const release = retainScreenshotImage(userId, screenshotId);
    retries.current = 0;
    setSrc(null);
    setLoaded(false);
    loadedRef.current = false;
    setFailed(false);
    void loadScreenshotImage(userId, screenshotId, sourceUrl).then(async (url) => {
      // A fetched blob is not necessarily decoded yet, especially on mobile.
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
        if (active) {
          setSrc(url);
          // A decoded preload can still fail to paint when its blob URL was
          // invalidated by the browser. Recover through the owner-checked URL.
          if (url.startsWith('blob:')) displayTimer.current = setTimeout(() => {
            if (active && !loadedRef.current) setSrc(`${screenshotImageFallbackPath(screenshotId)}?display=retry`);
          }, 3000);
        }
      } catch {
        if (active) setSrc(screenshotImageFallbackPath(screenshotId));
      }
    }).catch(() => { if (active) setSrc(screenshotImageFallbackPath(screenshotId)); });
    return () => { active = false; release(); if (timer.current) clearTimeout(timer.current); if (displayTimer.current) clearTimeout(displayTimer.current); };
  }, [screenshotId, sourceUrl, userId]);
  return <><img {...props} src={src ?? undefined} onLoad={(event) => {
    loadedRef.current = true;
    setLoaded(true);
    if (displayTimer.current) clearTimeout(displayTimer.current);
    props.onLoad?.(event);
  }} onError={(event) => {
    if (!src) return;
    loadedRef.current = false;
    setLoaded(false);
    if (retries.current >= 2) { setFailed(true); onError?.(event); return; }
    retries.current += 1;
    const attempt = retries.current;
    void invalidateScreenshotImage(userId, screenshotId);
    timer.current = setTimeout(() => setSrc(`${screenshotImageFallbackPath(screenshotId)}?retry=${attempt}`), attempt * 400);
  }} />{showStatus && !loaded && !failed && <span className="screenshot-image-loading" role="status" aria-label="Loading screenshot" />}{showStatus && failed && <span className="screenshot-image-error" role="alert">Image unavailable. Try reopening this screenshot.</span>}</>;
}
