"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryScreenshot } from '@/src/lib/screenshots';
import { activeSegmentAt, formatCaptureTime, narrationForScreenshot, segmentNarration } from '@/src/lib/slideshow';

function domain(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

export function ScreenshotGallery({ screenshots }: { screenshots: GalleryScreenshot[] }) {
  if (!screenshots.length) return <section className="panel"><h2>No screenshots yet</h2><p className="muted">Upload a screenshot above, or connect the ScreenPulse extension from Devices to capture automatically.</p></section>;
  return <GalleryWithSlideshow screenshots={screenshots} />;
}

type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'unsupported';

function GalleryWithSlideshow({ screenshots }: { screenshots: GalleryScreenshot[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [rate, setRate] = useState(1);
  const [activeSegment, setActiveSegment] = useState(-1);
  const [playRequest, setPlayRequest] = useState(0);
  const speechRun = useRef(0);
  const characterOffset = useRef(0);
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const screenshot = screenshots[index];
  const narration = useMemo(() => narrationForScreenshot(screenshot), [screenshot]);
  const segments = useMemo(() => segmentNarration(narration), [narration]);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const cancelSpeech = () => {
    speechRun.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
  };

  useEffect(() => () => cancelSpeech(), []);

  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || status !== 'playing' || !speechSupported) return;

    cancelSpeech();
    const run = speechRun.current;
    const startOffset = characterOffset.current;
    const utterance = new SpeechSynthesisUtterance(narration.slice(startOffset));
    utterance.rate = rate;
    utterance.onboundary = (event) => {
      if (speechRun.current !== run) return;
      const nextCharacter = startOffset + event.charIndex;
      characterOffset.current = nextCharacter;
      setActiveSegment(activeSegmentAt(segments, nextCharacter));
    };
    utterance.onend = () => {
      if (speechRun.current !== run) return;
      characterOffset.current = 0;
      setActiveSegment(-1);
      if (index < screenshots.length - 1) {
        setIndex(index + 1);
        setPlayRequest((request) => request + 1);
      } else {
        setStatus('complete');
      }
    };
    utterance.onerror = (event) => {
      if (speechRun.current !== run || event.error === 'canceled' || event.error === 'interrupted') return;
      setStatus('paused');
    };
    window.speechSynthesis.speak(utterance);

    return () => {
      if (speechRun.current === run) cancelSpeech();
    };
  }, [index, isOpen, narration, playRequest, rate, segments, speechSupported, status]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLSelectElement) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const beginAt = (nextIndex: number) => {
    cancelSpeech();
    characterOffset.current = 0;
    setActiveSegment(-1);
    setIndex(nextIndex);
    setStatus(speechSupported ? 'playing' : 'unsupported');
    setPlayRequest((request) => request + 1);
  };

  const open = () => {
    setIsOpen(true);
    beginAt(0);
  };

  const close = () => {
    cancelSpeech();
    setIsOpen(false);
    setStatus('idle');
    setActiveSegment(-1);
    characterOffset.current = 0;
    requestAnimationFrame(() => opener.current?.focus());
  };

  const previous = () => beginAt(Math.max(0, index - 1));
  const next = () => beginAt(Math.min(screenshots.length - 1, index + 1));
  const replay = () => beginAt(index);
  const togglePlayback = () => {
    if (!speechSupported) return;
    if (status === 'playing') {
      cancelSpeech();
      setStatus('paused');
      return;
    }
    setStatus('playing');
    setPlayRequest((request) => request + 1);
  };

  return <>
    <div className="gallery-toolbar"><p className="muted">{screenshots.length} capture{screenshots.length === 1 ? '' : 's'} available</p><button ref={opener} type="button" onClick={open}>Start slideshow</button></div>
    <section className="gallery" aria-label="Uploaded screenshots">{screenshots.map((shot) => <article className="card" key={shot.id}><Link href={`/screenshots/${shot.id}`}><img alt={`Screenshot from ${shot.page_title || domain(shot.page_url)}`} className="thumb" src={shot.imageUrl} /></Link><div className="card-body"><Link className="card-title" href={`/screenshots/${shot.id}`}>{shot.page_title || domain(shot.page_url)}</Link><span className="muted">{domain(shot.page_url)}</span><time className="muted" dateTime={shot.captured_at} suppressHydrationWarning>{formatCaptureTime(shot.captured_at)}</time>{shot.analysis_description && <p className="analysis-preview">{shot.analysis_description}</p>}</div></article>)}</section>
    {isOpen && <div className="slideshow-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="slideshow" role="dialog" aria-modal="true" aria-labelledby="slideshow-title" aria-describedby="slideshow-status"><header className="slideshow-header"><p className="muted">Screenshot {index + 1} of {screenshots.length}</p><button ref={closeButton} type="button" className="secondary" onClick={close} aria-label="Close slideshow">Close</button></header><div className="slideshow-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / screenshots.length) * 100}%` }} /></div><img className="slideshow-image" src={screenshot.imageUrl} alt={`Screenshot from ${screenshot.page_title || domain(screenshot.page_url)}`} /><div className="slideshow-content"><h2 id="slideshow-title">{screenshot.page_title || domain(screenshot.page_url)}</h2><p className="muted">{domain(screenshot.page_url)} · {formatCaptureTime(screenshot.captured_at)}</p><p className="slideshow-narration" aria-live="polite">{segments.map((segment, segmentIndex) => <span className={segmentIndex === activeSegment ? 'spoken-word' : undefined} key={`${segment.start}-${segment.end}`}>{segment.text}</span>)}</p><p id="slideshow-status" className="muted">{status === 'playing' && 'Reading description.'}{status === 'paused' && 'Playback paused.'}{status === 'complete' && 'Slideshow complete.'}{status === 'unsupported' && 'Voice playback is not supported by this browser. You can still browse the slideshow manually.'}</p><div className="slideshow-controls"><button type="button" className="secondary" onClick={previous} disabled={index === 0}>Previous</button><button type="button" onClick={togglePlayback} disabled={!speechSupported}>{status === 'playing' ? 'Pause' : 'Play'}</button><button type="button" className="secondary" onClick={replay} disabled={!speechSupported}>Replay</button><button type="button" className="secondary" onClick={next} disabled={index === screenshots.length - 1}>Next</button><label className="speech-rate">Speed<select value={rate} onChange={(event) => { setRate(Number(event.target.value)); if (status === 'playing') setPlayRequest((request) => request + 1); }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label></div></div></section></div>}
  </>;
}
