"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { activeSegmentAt, narrationForScreenshot, segmentNarration } from '@/src/lib/slideshow';
import type { GalleryScreenshot } from '@/src/lib/screenshots';

type NarratorStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'unsupported';
type NarratableScreenshot = Pick<GalleryScreenshot, 'analysis_description' | 'page_title' | 'page_url' | 'captured_at'>;

export function ScreenshotNarrator({ screenshot }: { screenshot: NarratableScreenshot }) {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [rate, setRate] = useState(1);
  const [activeSegment, setActiveSegment] = useState(-1);
  const [isSupported, setIsSupported] = useState(false);
  const [playRequest, setPlayRequest] = useState(0);
  const speechRun = useRef(0);
  const characterOffset = useRef(0);
  const narration = useMemo(() => narrationForScreenshot(screenshot), [screenshot]);
  const segments = useMemo(() => segmentNarration(narration), [narration]);

  const cancelSpeech = () => {
    speechRun.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  useEffect(() => {
    setIsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    return () => cancelSpeech();
  }, []);

  useEffect(() => {
    if (!isSupported || status !== 'playing') return;

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
      setStatus('complete');
    };
    utterance.onerror = (event) => {
      if (speechRun.current !== run || event.error === 'canceled' || event.error === 'interrupted') return;
      setStatus('paused');
    };
    window.speechSynthesis.speak(utterance);

    return () => {
      if (speechRun.current === run) cancelSpeech();
    };
  }, [isSupported, narration, playRequest, rate, segments, status]);

  const playOrPause = () => {
    if (!isSupported) return;
    if (status === 'playing') {
      cancelSpeech();
      setStatus('paused');
      return;
    }
    if (status === 'complete') {
      characterOffset.current = 0;
      setActiveSegment(-1);
    }
    setStatus('playing');
    setPlayRequest((request) => request + 1);
  };

  const replay = () => {
    if (!isSupported) return;
    cancelSpeech();
    characterOffset.current = 0;
    setActiveSegment(-1);
    setStatus('playing');
    setPlayRequest((request) => request + 1);
  };

  return <div className="narrator">
    <p className="narrator-text">{segments.map((segment, index) => <span className={index === activeSegment ? 'spoken-word' : undefined} key={`${segment.start}-${segment.end}`}>{segment.text}</span>)}</p>
    <div className="narrator-controls">
      <button type="button" onClick={playOrPause} disabled={!isSupported} aria-label={status === 'playing' ? 'Pause description narration' : 'Read description aloud'}>
        {status === 'playing' ? '❚❚ Pause' : '🔊 Read aloud'}
      </button>
      <button type="button" className="secondary" onClick={replay} disabled={!isSupported}>Replay</button>
      <label className="speech-rate">Speed<select value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={!isSupported}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
    </div>
    <p className="muted narrator-status" aria-live="polite">{status === 'playing' && 'Reading description.'}{status === 'paused' && 'Playback paused.'}{status === 'complete' && 'Narration complete.'}{!isSupported && 'Voice playback is not supported by this browser.'}</p>
  </div>;
}
