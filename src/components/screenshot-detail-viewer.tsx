'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconChevronRight, IconFolder, IconNotes, IconX } from '@tabler/icons-react';
import { ScreenshotNarrator } from '@/src/components/screenshot-narrator';
import { ScreenshotNotesForm } from '@/src/components/screenshot-notes-form';
import { ScreenshotTitleEditor } from '@/src/components/screenshot-title-editor';
import { CopyTextButton } from '@/src/components/copy-text-button';
import { AppNav } from '@/src/components/app-nav';
import { deleteScreenshot } from '@/app/screenshots/[id]/actions';
import { CachedScreenshotImage } from '@/src/components/cached-screenshot-image';
import { warmScreenshotImage } from '@/src/lib/screenshot-image-cache';
import { screenshotDisplayTitle, screenshotSourceDomain } from '@/src/lib/screenshot-labels';
import type { ScreenshotContext, ContextScreenshot } from '@/src/lib/screenshot-context';
import type { ScreenshotView } from '@/src/lib/screenshots';


export function ScreenshotDetailViewer({ initialContext, view, page, imageOnly: initialImageOnly, email, userId }: { initialContext: ScreenshotContext; view: ScreenshotView; page: number; imageOnly: boolean; email: string; userId: string }) {
  const [context, setContext] = useState(initialContext);
  const [index, setIndex] = useState(initialContext.currentIndex);
  const [imageOnly, setImageOnly] = useState(initialImageOnly);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesOffset, setNotesOffset] = useState(0);
  const [draggingNotes, setDraggingNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const cache = useRef(new Map<string, ScreenshotContext>());
  const edits = useRef(new Map<string, Partial<ContextScreenshot>>());
  const imageOnlyRef = useRef<HTMLElement>(null);
  const notesSheetRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const gesture = useRef<{ mode: 'swipe' | 'pinch' | 'pan' | 'notes'; x: number; y: number; distance: number; zoom: number; panX: number; panY: number } | null>(null);
  const notesGesture = useRef<{ y: number; offset: number; height: number } | null>(null);
  const screenshot = context.items[index];
  const base = useMemo(() => view.kind === 'folder' ? `view=folder&folder=${encodeURIComponent(view.folderId ?? '')}&page=${page}` : `view=${view.kind}&page=${page}`, [page, view]);
  const hrefFor = useCallback((id: string) => `/screenshots/${id}?${base}${imageOnly ? '&mode=image' : ''}`, [base, imageOnly]);
  const backHref = `/dashboard?${base}`;
  const updateScreenshot = useCallback((id: string, patch: Partial<ContextScreenshot>) => {
    edits.current.set(id, { ...edits.current.get(id), ...patch });
    const update = (value: ScreenshotContext) => ({ ...value, items: value.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
    setContext(update);
    for (const [key, value] of cache.current) cache.current.set(key, update(value));
  }, []);

  const fetchContext = useCallback(async (id: string) => {
    const existing = cache.current.get(id);
    if (existing) return existing;
    const response = await fetch(`/api/screenshots/context?id=${encodeURIComponent(id)}&${base}`);
    if (!response.ok) throw new Error('Could not load the next screenshot.');
    const next = await response.json() as ScreenshotContext;
    next.items = next.items.map((item) => ({ ...item, ...edits.current.get(item.id) }));
    cache.current.set(id, next);
    return next;
  }, [base]);

  useEffect(() => {
    for (const image of context.items) void warmScreenshotImage(userId, image.id, image.imageUrl);
    for (const edgeId of [context.previousId, context.nextId]) if (edgeId) void fetchContext(edgeId).catch(() => undefined);
  }, [context, fetchContext, userId]);

  const changeUrl = useCallback((id: string, mode = imageOnly) => window.history.pushState(null, '', `/screenshots/${id}?${base}${mode ? '&mode=image' : ''}`), [base, imageOnly]);
  const move = useCallback(async (direction: -1 | 1) => {
    const localIndex = index + direction;
    if (context.items[localIndex]) { setIndex(localIndex); setZoom(1); setPan({ x: 0, y: 0 }); setNotesOpen(false); setNotesOffset(0); changeUrl(context.items[localIndex].id); return; }
    const edgeId = direction < 0 ? context.previousId : context.nextId;
    if (!edgeId || loading) return;
    setLoading(true);
    try {
      const next = await fetchContext(edgeId);
      setContext(next);
      setIndex(next.currentIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setNotesOpen(false);
      setNotesOffset(0);
      changeUrl(edgeId);
    } finally { setLoading(false); }
  }, [changeUrl, context, fetchContext, index, loading]);

  useEffect(() => {
    const keys = (event: KeyboardEvent) => { if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return; if (event.key === 'ArrowLeft') void move(-1); if (event.key === 'ArrowRight') void move(1); if (event.key === 'Escape' && imageOnly) { if (document.fullscreenElement) void document.exitFullscreen(); else setImageOnly(false); } };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [imageOnly, move]);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const toggleImageOnly = () => { if (document.fullscreenElement) void document.exitFullscreen(); setNotesOpen(false); setNotesOffset(0); const next = !imageOnly; setImageOnly(next); changeUrl(screenshot.id, next); };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await imageOnlyRef.current?.requestFullscreen(); } catch { setFullscreen(Boolean(document.fullscreenElement)); } };
  const onTouchEnd = (event: React.TouchEvent) => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = (touch?.clientX ?? start.x) - start.x; const dy = (touch?.clientY ?? start.y) - start.y; if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) void move(dx < 0 ? 1 : -1); };
  const touchProps = { onTouchStart: (event: React.TouchEvent) => { if (event.target instanceof Element && event.target.closest('form, button, input, textarea, select')) { touchStart.current = null; return; } const touch = event.touches[0]; touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null; }, onTouchEnd };
  const imageTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 2) {
      const [first, second] = [event.touches[0], event.touches[1]];
      gesture.current = { mode: 'pinch', x: 0, y: 0, distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY), zoom, panX: pan.x, panY: pan.y };
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    if (screenshot.user_notes?.trim() && !notesOpen && touch.clientY > window.innerHeight - 64) {
      const height = notesSheetRef.current?.getBoundingClientRect().height ?? Math.min(window.innerHeight * .62, 520);
      gesture.current = { mode: 'notes', x: touch.clientX, y: touch.clientY, distance: height, zoom, panX: pan.x, panY: pan.y };
      return;
    }
    gesture.current = { mode: zoom > 1 ? 'pan' : 'swipe', x: touch.clientX, y: touch.clientY, distance: 0, zoom, panX: pan.x, panY: pan.y };
  };
  const imageTouchMove = (event: React.TouchEvent) => {
    const active = gesture.current;
    if (!active) return;
    if (active.mode === 'notes' && event.touches[0]) {
      const delta = event.touches[0].clientY - active.y;
      if (delta < 0) {
        event.preventDefault();
        setNotesOpen(true);
        setNotesOffset(Math.max(0, Math.min(active.distance - 56, active.distance + delta)));
      }
      return;
    }
    if (event.touches.length === 2) {
      const [first, second] = [event.touches[0], event.touches[1]];
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      if (active.distance) { event.preventDefault(); setZoom(Math.min(4, Math.max(1, active.zoom * (distance / active.distance)))); }
      return;
    }
    if (active.mode === 'pan' && event.touches[0]) { event.preventDefault(); setPan({ x: active.panX + event.touches[0].clientX - active.x, y: active.panY + event.touches[0].clientY - active.y }); }
  };
  const imageTouchEnd = (event: React.TouchEvent) => {
    const active = gesture.current;
    if (!active) return;
    if (event.touches.length) return;
    gesture.current = null;
    if (active.mode === 'notes') {
      if (notesOffset > active.distance * .75) { setNotesOpen(false); setNotesOffset(0); }
      return;
    }
    if (active.mode !== 'swipe') return;
    const touch = event.changedTouches[0];
    const dx = (touch?.clientX ?? active.x) - active.x;
    const dy = (touch?.clientY ?? active.y) - active.y;
    if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) void move(dx < 0 ? 1 : -1);
  };
  const startNotesDrag = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    const height = notesSheetRef.current?.getBoundingClientRect().height;
    if (!touch || !height) return;
    event.stopPropagation();
    notesGesture.current = { y: touch.clientY, offset: notesOffset, height };
    setDraggingNotes(true);
  };
  const moveNotesDrag = (event: React.TouchEvent) => {
    const active = notesGesture.current;
    const touch = event.touches[0];
    if (!active || !touch) return;
    event.preventDefault(); event.stopPropagation();
    setNotesOffset(Math.max(0, Math.min(active.height - 56, active.offset + touch.clientY - active.y)));
  };
  const endNotesDrag = (event: React.TouchEvent) => {
    const active = notesGesture.current;
    if (!active) return;
    event.stopPropagation(); notesGesture.current = null; setDraggingNotes(false);
    if (notesOffset > active.height * .75) { setNotesOpen(false); setNotesOffset(0); }
  };

  const toggleNotes = () => { if (notesOpen) { setNotesOpen(false); setNotesOffset(0); } else { setNotesOffset(0); setNotesOpen(true); } };
  if (imageOnly) return <main ref={imageOnlyRef} className="image-only-view" onTouchStart={imageTouchStart} onTouchMove={imageTouchMove} onTouchEnd={imageTouchEnd}><CachedScreenshotImage key={screenshot.id} showStatus userId={userId} screenshotId={screenshot.id} sourceUrl={screenshot.imageUrl} className="image-only-image" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} alt={`Screenshot from ${screenshotDisplayTitle(screenshot.page_title, screenshot.page_url)}`} /><div className="image-only-controls"><button className="image-only-button" type="button" onClick={toggleImageOnly} aria-label="Exit image-only view"><IconX aria-hidden="true" size={22} /></button><button className="image-only-button" type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <IconArrowsMinimize aria-hidden="true" size={20} /> : <IconArrowsMaximize aria-hidden="true" size={20} />}</button>{screenshot.user_notes?.trim() && <button className="image-only-button" type="button" onClick={toggleNotes} aria-label={notesOpen ? 'Hide notes' : 'Show notes'} aria-expanded={notesOpen}><IconNotes aria-hidden="true" size={20} /></button>}<button className="image-only-button" type="button" onClick={() => void move(-1)} disabled={zoom > 1 || (!context.items[index - 1] && !context.previousId)} aria-label="Previous screenshot"><IconChevronLeft aria-hidden="true" size={24} /></button><button className="image-only-button" type="button" onClick={() => void move(1)} disabled={zoom > 1 || (!context.items[index + 1] && !context.nextId)} aria-label="Next screenshot"><IconChevronRight aria-hidden="true" size={24} /></button></div>{screenshot.user_notes?.trim() && <section ref={notesSheetRef} className={notesOpen ? `image-notes-sheet image-notes-sheet-open${draggingNotes ? ' image-notes-sheet-dragging' : ''}` : 'image-notes-sheet'} style={notesOpen ? { transform: `translateY(${notesOffset}px)` } : undefined} aria-hidden={!notesOpen} onTouchStart={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}><div className="image-notes-grabber" onTouchStart={startNotesDrag} onTouchMove={moveNotesDrag} onTouchEnd={endNotesDrag}><div className="image-notes-handle" /></div><div className="image-notes-heading"><strong>Additional notes</strong><CopyTextButton text={screenshot.user_notes} label="additional notes" /><button className="image-notes-close" type="button" onClick={() => { setNotesOpen(false); setNotesOffset(0); }} aria-label="Hide notes"><IconX aria-hidden="true" size={20} /></button></div><p>{screenshot.user_notes}</p></section>}</main>;

  return <main className="shell" {...touchProps}><AppNav email={email} /><nav className="detail-navigation" aria-label="Screenshot navigation"><Link href={backHref}>← Back to collection</Link><div><button className="secondary" type="button" onClick={toggleImageOnly}>View image only</button><button className="secondary" type="button" onClick={() => void move(-1)} disabled={!context.items[index - 1] && !context.previousId}>Previous</button><button className="secondary" type="button" onClick={() => void move(1)} disabled={!context.items[index + 1] && !context.nextId}>Next</button></div></nav><article className="panel"><CachedScreenshotImage key={screenshot.id} showStatus userId={userId} screenshotId={screenshot.id} sourceUrl={screenshot.imageUrl} className="detail-image" alt={`Screenshot from ${screenshotDisplayTitle(screenshot.page_title, screenshot.page_url)}`} /><div className="detail-meta"><ScreenshotTitleEditor key={screenshot.id} screenshotId={screenshot.id} name={screenshotDisplayTitle(screenshot.page_title, screenshot.page_url)} onSaved={(name) => updateScreenshot(screenshot.id, { page_title: name })} />{screenshotSourceDomain(screenshot.page_url) && <a href={screenshot.page_url} rel="noreferrer" target="_blank">{screenshotSourceDomain(screenshot.page_url)}</a>}<div className="detail-submeta"><Link className="detail-folder-link" href={screenshot.folder ? `/dashboard?view=folder&folder=${encodeURIComponent(screenshot.folder.id)}` : '/dashboard?view=unfiled'} title={screenshot.folder?.name ?? 'Unfiled'} aria-label={`Open folder: ${screenshot.folder?.name ?? 'Unfiled'}`}><IconFolder size={18} aria-hidden="true" /><span>{screenshot.folder?.name ?? 'Unfiled'}</span></Link><time className="muted" dateTime={screenshot.captured_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'medium' }).format(new Date(screenshot.captured_at))}</time></div></div>{screenshot.analysis_description?.trim() && <section className="analysis"><div className="screenshot-section-heading"><h2>{screenshot.analysis_provider === 'CODEX_MCP' ? 'Codex analysis' : 'AI analysis'}</h2><CopyTextButton text={screenshot.analysis_description} label="AI analysis" /></div><ScreenshotNarrator text={screenshot.analysis_description} label="analysis" emptyText="" />{screenshot.analysis_provider === 'CODEX_MCP' && <p className="muted">Analyzed by Codex{ screenshot.analyzed_at ? ` on ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(screenshot.analyzed_at))}` : '' }.</p>}</section>}<section className="analysis"><h2>Your additional notes</h2><ScreenshotNotesForm key={screenshot.id} screenshotId={screenshot.id} notes={screenshot.user_notes} onSaved={(notes) => updateScreenshot(screenshot.id, { user_notes: notes })} /><ScreenshotNarrator text={screenshot.user_notes} label="notes" emptyText="No additional notes saved yet." /></section><form action={deleteScreenshot}><input name="screenshotId" type="hidden" value={screenshot.id} /><button className="danger" type="submit">Delete permanently</button></form>{loading && <p className="muted viewer-loading">Loading next screenshots…</p>}</article></main>;
}
