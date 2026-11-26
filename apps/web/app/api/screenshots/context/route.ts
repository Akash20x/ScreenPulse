import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { loadScreenshotContext } from '@/src/lib/screenshot-context';
import type { ScreenshotView } from '@/src/lib/screenshots';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = (await createClient()).auth.getUser();
  const {
    data: { user: signedInUser }
  } = await user;
  if (!signedInUser)
    return NextResponse.json(
      { error: 'Sign in to browse screenshots.' },
      { status: 401 }
    );
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  const viewName = url.searchParams.get('view');
  const folderId = url.searchParams.get('folder')?.trim();
  if (!id)
    return NextResponse.json(
      { error: 'Screenshot ID is required.' },
      { status: 400 }
    );
  const view: ScreenshotView =
    viewName === 'folder' && folderId
      ? { kind: 'folder', folderId }
      : viewName === 'unfiled'
        ? { kind: 'unfiled' }
        : { kind: 'all' };
  const context = await loadScreenshotContext(signedInUser.id, id, view);
  if (!context)
    return NextResponse.json(
      { error: 'Screenshot not found in this collection.' },
      { status: 404 }
    );
  return NextResponse.json(context, {
    headers: { 'Cache-Control': 'private, no-store' }
  });
}
