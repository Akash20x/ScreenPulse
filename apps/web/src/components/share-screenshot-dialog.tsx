'use client';

import { useEffect, useState } from 'react';

type LinkInfo = { id: string; expires_at: string };
export function ShareScreenshotDialog({ screenshotId, onClose }: { screenshotId: string; onClose: () => void }) {
  const [hours, setHours] = useState(24); const [notes, setNotes] = useState(false); const [analysis, setAnalysis] = useState(false);
  const [hasNotes, setHasNotes] = useState(false); const [hasAnalysis, setHasAnalysis] = useState(false);
  const [links, setLinks] = useState<LinkInfo[]>([]); const [url, setUrl] = useState(''); const [linkId, setLinkId] = useState('');
  const [pending, setPending] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [copied, setCopied] = useState(false);
  const endpoint = `/api/screenshots/${encodeURIComponent(screenshotId)}/shares`;
  useEffect(() => { let mounted = true; fetch(endpoint).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load links.'); if (mounted) { setLinks(data.links); setHasNotes(data.hasNotes); setHasAnalysis(data.hasAnalysis); } }).catch((cause) => { if (mounted) setError(cause.message || 'Could not load links.'); }).finally(() => { if (mounted) setLoading(false); }); return () => { mounted = false; }; }, [endpoint]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [pending, onClose]);
  async function create() {
    if (loading) return;
    setPending(true); setError(''); setCopied(false);
    try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours, includeNotes: notes, includeAnalysis: analysis }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not create link.'); setUrl(`${window.location.origin}/share/${data.token}`); setLinkId(data.id); setLinks([{ id: data.id, expires_at: data.expiresAt }]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create link.'); } finally { setPending(false); }
  }
  async function revoke(id: string) {
    setPending(true); setError('');
    try { const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkId: id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not revoke link.'); setLinks((current) => current.filter((item) => item.id !== id)); if (id === linkId) { setUrl(''); setCopied(false); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not revoke link.'); } finally { setPending(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(url); setCopied(true); setError(''); } catch { setCopied(false); setError('Could not copy automatically. Select and copy the link below.'); } }
  return <div className="upload-backdrop"><section className="upload-modal share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="upload-modal-header"><div><p className="upload-kicker">Public sharing</p><h2 id="share-title">Create share link</h2><p>Anyone with the link can view this screenshot until it expires.</p></div><button className="modal-close" type="button" onClick={onClose} disabled={pending} aria-label="Close">×</button></div><div className="share-form"><label>Link expires after<select value={hours} onChange={(event) => setHours(Number(event.target.value))} disabled={pending}><option value={1}>1 hour</option><option value={24}>24 hours</option><option value={168}>7 days</option></select></label>{hasNotes && <label className="share-check"><input type="checkbox" checked={notes} onChange={(event) => setNotes(event.target.checked)} disabled={pending} /> Include additional notes</label>}{hasAnalysis && <label className="share-check"><input type="checkbox" checked={analysis} onChange={(event) => setAnalysis(event.target.checked)} disabled={pending} /> Include AI analysis</label>}{links.length > 0 && <p className="muted">Creating a new link revokes the previous link.</p>}<button type="button" disabled={pending || loading} onClick={() => void create()}>{pending || loading ? 'Please wait…' : 'Create link'}</button>{url && <div className="share-link"><label>Share link<input readOnly value={url} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" className="secondary" onClick={() => void copy()}>Copy link</button>{copied && <p role="status">Link copied.</p>}<small>Copy it now; the link cannot be displayed again after closing this dialog.</small></div>}{error && <p className="error" role="alert">{error}</p>}{links.length > 0 && <div className="share-active"><strong>Active link</strong>{links.map((link) => <div key={link.id}><span>Expires {new Date(link.expires_at).toLocaleString()}</span><button className="secondary" type="button" disabled={pending} onClick={() => void revoke(link.id)}>Revoke</button></div>)}</div>}</div></section></div>;
}
