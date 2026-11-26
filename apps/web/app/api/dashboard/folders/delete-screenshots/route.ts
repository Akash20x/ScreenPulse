import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const runtime = 'nodejs';

type DeleteRequest = { folderId?: string; screenshotIds?: string[]; deleteAll?: boolean };

function chunks<T>(items: T[], size = 100) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to delete screenshots.' }, { status: 401 });
  let body: DeleteRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid delete request.' }, { status: 400 }); }
  const folderId = typeof body.folderId === 'string' ? body.folderId : '';
  const requestedIds = Array.isArray(body.screenshotIds) ? [...new Set(body.screenshotIds.filter((id): id is string => typeof id === 'string'))] : [];
  if (!folderId || (!body.deleteAll && !requestedIds.length)) return NextResponse.json({ error: 'Choose screenshots to delete.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: folder } = await admin.from('screenshot_folders').select('id').eq('id', folderId).eq('user_id', user.id).maybeSingle();
  if (!folder) return NextResponse.json({ error: 'Folder not found.' }, { status: 404 });
  let query = admin.from('screenshots').select('id,storage_path').eq('user_id', user.id).eq('folder_id', folderId);
  if (!body.deleteAll) query = query.in('id', requestedIds);
  const { data: screenshots, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not find those screenshots.' }, { status: 503 });
  if (!screenshots?.length) return NextResponse.json({ error: 'Those screenshots are no longer available.' }, { status: 404 });

  for (const group of chunks(screenshots)) {
    const { error: storageError } = await admin.storage.from('screenshots').remove(group.map((item) => item.storage_path));
    if (storageError) return NextResponse.json({ error: 'Could not remove private image files. Nothing was deleted from the library.' }, { status: 503 });
    const { error: deleteError } = await admin.from('screenshots').delete().eq('user_id', user.id).in('id', group.map((item) => item.id));
    if (deleteError) return NextResponse.json({ error: 'Image files were removed but their library entries could not be deleted.' }, { status: 503 });
  }
  const { data: remaining } = await admin.from('screenshots').select('id').eq('user_id', user.id).eq('folder_id', folderId).limit(1);
  const folderRemoved = !remaining?.length;
  if (folderRemoved) await admin.from('screenshot_folders').delete().eq('id', folderId).eq('user_id', user.id);
  revalidatePath('/dashboard');
  return NextResponse.json({ deletedCount: screenshots.length, folderRemoved });
}
