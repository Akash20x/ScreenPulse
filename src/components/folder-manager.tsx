'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createScreenshotFolder, deleteScreenshotFolder, renameScreenshotFolder, type UploadScreenshotState } from '@/app/dashboard/actions';
import type { ScreenshotFolder } from '@/src/lib/folders';
import type { ScreenshotView } from '@/src/lib/screenshots';

const initialState: UploadScreenshotState = {};
const hrefFor = (view: 'all' | 'unfiled' | 'folder', folderId?: string) => view === 'folder' ? `/dashboard?view=folder&folder=${encodeURIComponent(folderId ?? '')}` : `/dashboard?view=${view}`;

function FolderRow({ folder, selected, onDelete }: { folder: ScreenshotFolder; selected: boolean; onDelete: (folder: ScreenshotFolder) => void }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(renameScreenshotFolder, initialState);

  return <li className="folder-row">{editing ? <form action={action} className="inline-form"><input name="folderId" type="hidden" value={folder.id} /><input aria-label="Folder name" defaultValue={folder.name} name="name" maxLength={80} required /><button type="submit" disabled={pending}>Save</button><button className="secondary" type="button" onClick={() => setEditing(false)} disabled={pending}>Cancel</button>{state.error && <span className="error">{state.error}</span>}</form> : <><Link className={selected ? 'folder-link selected-folder' : 'folder-link'} href={hrefFor('folder', folder.id)} title={folder.name}><span>{folder.name}</span><small>{folder.screenshotCount}</small></Link><button className="secondary small-button" type="button" onClick={() => setEditing(true)}>Rename</button><button className="secondary small-button" type="button" onClick={() => onDelete(folder)} aria-label={`Delete folder ${folder.name}`}>Delete</button></>}</li>;
}

function DeleteFolderActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return <div className="delete-dialog-actions"><button className="secondary" type="button" disabled={pending} onClick={onCancel}>Cancel</button><button className="danger" type="submit" disabled={pending}>{pending ? 'Deleting…' : 'Delete folder'}</button></div>;
}

function DeleteFolderDialog({ folder, onClose }: { folder: ScreenshotFolder; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const deleteFolder = async (formData: FormData) => {
    try {
      const result = await deleteScreenshotFolder(formData);
      if (result.error) setError(result.error);
      else onClose();
    } catch {
      setError('Could not delete that folder. Please try again.');
    }
  };

  return <dialog className="delete-dialog folder-delete-dialog" ref={dialogRef} onClose={onClose} aria-labelledby="delete-folder-title" aria-describedby="delete-folder-description"><form action={deleteFolder}><input name="folderId" type="hidden" value={folder.id} /><p className="brand">DELETE FOLDER</p><h2 id="delete-folder-title">Delete “{folder.name}”?</h2><p id="delete-folder-description">{folder.screenshotCount ? `${folder.screenshotCount} screenshot${folder.screenshotCount === 1 ? '' : 's'} will move to Unfiled. ` : ''}The folder will be removed. This cannot be undone.</p>{error && <p className="error" role="alert">{error}</p>}<DeleteFolderActions onCancel={() => dialogRef.current?.close()} /></form></dialog>;
}

export function FolderManager({ folders, selectedView, unfiledCount, totalCount }: { folders: ScreenshotFolder[]; selectedView: ScreenshotView | null; unfiledCount: number; totalCount: number }) {
  const [state, action, pending] = useActionState(createScreenshotFolder, initialState);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ScreenshotFolder | null>(null);
  const visibleFolders = useMemo(() => folders.filter((folder) => !folder.is_default && folder.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [folders, query]);
  const defaultFolder = folders.find((folder) => folder.is_default);

  return <><aside className="panel folder-manager"><div className="folder-heading"><h2>Library</h2><span className="muted">{totalCount} screenshots</span></div><form action={action} className="inline-form"><input name="name" maxLength={80} placeholder="New folder name" required /><button type="submit" disabled={pending}>Create</button></form>{state.error && <p className="error">{state.error}</p>}<nav className="folder-nav" aria-label="Screenshot folders"><Link className={selectedView?.kind === 'all' ? 'folder-link selected-folder' : 'folder-link'} href={hrefFor('all')}><span>All screenshots</span><small>{totalCount}</small></Link>{defaultFolder && defaultFolder.screenshotCount > 0 && <Link className={selectedView?.kind === 'folder' && selectedView.folderId === defaultFolder.id ? 'folder-link selected-folder' : 'folder-link'} href={hrefFor('folder', defaultFolder.id)}><span>Unfiled</span><small>{defaultFolder.screenshotCount}</small></Link>}</nav><label className="folder-search">Find folder<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" type="search" /></label><p className="muted folder-count">{visibleFolders.length} of {folders.filter((folder) => !folder.is_default).length} folders</p><ul className="folder-list">{visibleFolders.map((folder) => <FolderRow folder={folder} key={folder.id} selected={selectedView?.kind === 'folder' && selectedView.folderId === folder.id} onDelete={setDeleteTarget} />)}</ul></aside>{deleteTarget && <DeleteFolderDialog folder={deleteTarget} onClose={() => setDeleteTarget(null)} />}</>;
}
