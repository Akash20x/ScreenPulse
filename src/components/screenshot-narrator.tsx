'use client';

import { useEffect, useId, useRef, useState } from 'react';

type NarrationStatus = 'idle' | 'playing' | 'paused' | 'complete';

export function NarrationControls({ text, label, onComplete, onStart, onStop, autoPlay = false }: { text: string; label: string; onComplete?: () => void; onStart?: () => void; onStop?: () => void; autoPlay?: boolean }) {
  const id = useId(); const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const startedAutomatically = useRef(false);
  const position = useRef(0); const speechToken = useRef(0); const resumeCheck = useRef<number | null>(null);
  const [supported, setSupported] = useState(false); const [status, setStatus] = useState<NarrationStatus>('idle'); const [rate, setRate] = useState(1);
  const clearResumeCheck = () => { if (resumeCheck.current !== null) { window.clearTimeout(resumeCheck.current); resumeCheck.current = null; } };
  const cancelSpeech = () => { clearResumeCheck(); speechToken.current += 1; window.speechSynthesis?.cancel(); utterance.current = null; };
  const stop = () => { cancelSpeech(); setStatus('idle'); };
  useEffect(() => { setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window); const cancelOther = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) stop(); }; window.addEventListener('screenpulse-narration-start', cancelOther); return () => { window.removeEventListener('screenpulse-narration-start', cancelOther); cancelSpeech(); }; }, [id]);
  const speakFrom = (from: number, notifyStart: boolean) => {
    if (!supported || !text.trim()) return;
    clearResumeCheck(); cancelSpeech();
    const token = speechToken.current + 1; speechToken.current = token; position.current = from;
    if (notifyStart) { startedAutomatically.current = true; onStart?.(); window.dispatchEvent(new CustomEvent('screenpulse-narration-start', { detail: id })); }
    const next = new SpeechSynthesisUtterance(text.slice(from));
    next.rate = rate;
    next.onboundary = (event) => { position.current = from + event.charIndex; };
    next.onend = () => { if (token !== speechToken.current) return; clearResumeCheck(); position.current = text.length; setStatus('complete'); onComplete?.(); };
    next.onerror = () => { if (token === speechToken.current) { clearResumeCheck(); setStatus('idle'); } };
    utterance.current = next; setStatus('playing'); window.speechSynthesis.speak(next);
  };
  const start = () => speakFrom(0, true);
  useEffect(() => { if (autoPlay && !startedAutomatically.current) start(); }, [autoPlay, supported]);
  const togglePause = () => {
    if (status === 'playing') { clearResumeCheck(); window.speechSynthesis.pause(); setStatus('paused'); return; }
    if (status === 'paused') {
      const token = speechToken.current;
      window.speechSynthesis.resume(); setStatus('playing');
      resumeCheck.current = window.setTimeout(() => {
        if (token !== speechToken.current) return;
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        if (!window.speechSynthesis.speaking) speakFrom(position.current, false);
      }, 300);
      return;
    }
    start();
  };
  return <div className="narrator-controls"><button type="button" onClick={togglePause} disabled={!supported}>{status === 'playing' ? 'Pause' : status === 'paused' ? 'Resume' : `Read ${label}`}</button><button className="secondary" type="button" onClick={() => { stop(); onStop?.(); }} disabled={!supported || status === 'idle'}>Stop</button><label className="speech-rate">Speed<select value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={!supported || status === 'playing' || status === 'paused'}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>{!supported && <span className="muted">Voice playback is unavailable.</span>}</div>;
}

export function ScreenshotNarrator({ text, label, emptyText }: { text: string | null; label: string; emptyText: string }) {
  if (!text?.trim()) return <p className="muted narrator-status">{emptyText}</p>;
  return <div className="narrator"><p className="narrator-text">{text}</p><NarrationControls text={text} label={label} /></div>;
}
