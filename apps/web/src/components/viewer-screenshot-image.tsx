'use client';

import { useEffect, useRef, useState } from 'react';
import {
  currentScreenshotSessionUser,
  evictScreenshotSessionImage,
  screenshotSessionImagePath,
  sessionScreenshotImagePath
} from '@/src/lib/screenshot-session-cache';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  userId?: string;
  screenshotId: string;
  sourceUrl?: string;
  showStatus?: boolean;
};

/** Uses a normal same-origin URL which the session service worker can satisfy locally. */
export function ViewerScreenshotImage({
  userId,
  screenshotId,
  sourceUrl,
  showStatus = true,
  onLoad,
  onError,
  ...props
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const attempts = useRef(0);

  // Keep this transition prop for gallery/slideshow callers while the service
  // worker becomes the single source of image responses.
  void sourceUrl;

  useEffect(() => {
    let active = true;
    attempts.current = 0;
    setSrc(null);
    setLoaded(false);
    setFailed(false);
    const cacheUser = userId ?? currentScreenshotSessionUser();
    if (cacheUser)
      void screenshotSessionImagePath(cacheUser, screenshotId).then((path) => {
        if (active) setSrc(path);
      });
    else setSrc(sessionScreenshotImagePath(screenshotId));
    return () => {
      active = false;
    };
  }, [screenshotId, userId]);

  return (
    <>
      <img
        {...props}
        src={src ?? undefined}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (attempts.current < 1) {
            attempts.current += 1;
            const cacheUser = userId ?? currentScreenshotSessionUser();
            const eviction = cacheUser
              ? evictScreenshotSessionImage(cacheUser, screenshotId)
              : Promise.resolve();
            void eviction.finally(() => {
              setSrc(
                `${sessionScreenshotImagePath(screenshotId)}?retry=${Date.now()}`
              );
            });
            return;
          }
          setFailed(true);
          onError?.(event);
        }}
      />
      {showStatus && !loaded && !failed && (
        <span
          className="screenshot-image-loading"
          role="status"
          aria-label="Loading screenshot"
        />
      )}
      {showStatus && failed && (
        <span className="screenshot-image-error" role="alert">
          Image unavailable. Try reopening this screenshot.
        </span>
      )}
    </>
  );
}
