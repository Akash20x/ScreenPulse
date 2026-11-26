import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import {
  createShareToken,
  hashShareToken,
  SHARE_DURATIONS
} from '@/src/lib/screenshot-shares';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
async function owner() {
  const client = await createClient();
  return (await client.auth.getUser()).data.user;
}
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await owner();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in first.' },
      { status: 401, headers }
    );
  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: screenshot } = await admin
    .from('screenshots')
    .select('id,user_notes,analysis_description')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('storage_status', 'stored')
    .maybeSingle();
  if (!screenshot)
    return NextResponse.json(
      { error: 'Screenshot not found.' },
      { status: 404, headers }
    );
  const { data, error } = await admin
    .from('screenshot_public_shares')
    .select('id,expires_at,created_at')
    .eq('user_id', user.id)
    .eq('screenshot_id', id)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error)
    return NextResponse.json(
      { error: 'Could not load links.' },
      { status: 503, headers }
    );
  return NextResponse.json(
    {
      links: data,
      hasNotes: Boolean(screenshot.user_notes?.trim()),
      hasAnalysis: Boolean(screenshot.analysis_description?.trim())
    },
    { headers }
  );
}

export async function POST(request: Request, context: Context) {
  const user = await owner();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in first.' },
      { status: 401, headers }
    );
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (
    !body ||
    !SHARE_DURATIONS.includes(body.hours) ||
    typeof body.includeNotes !== 'boolean' ||
    typeof body.includeAnalysis !== 'boolean'
  )
    return NextResponse.json(
      { error: 'Choose a valid expiry and sharing options.' },
      { status: 400, headers }
    );
  const token = createShareToken();
  const expiresAt = new Date(Date.now() + body.hours * 3600000).toISOString();
  const { data, error } = await createAdminClient().rpc(
    'replace_screenshot_share',
    {
      p_user_id: user.id,
      p_screenshot_id: id,
      p_token_hash: hashShareToken(token),
      p_expires_at: expiresAt,
      p_include_notes: body.includeNotes,
      p_include_analysis: body.includeAnalysis
    }
  );
  if (error || !data)
    return NextResponse.json(
      {
        error:
          'Could not create the link. Check that the screenshot still exists.'
      },
      { status: 503, headers }
    );
  return NextResponse.json(
    { id: data, token, expiresAt },
    { status: 201, headers }
  );
}

export async function DELETE(request: Request, context: Context) {
  const user = await owner();
  if (!user)
    return NextResponse.json(
      { error: 'Sign in first.' },
      { status: 401, headers }
    );
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (typeof body?.linkId !== 'string')
    return NextResponse.json(
      { error: 'Invalid link.' },
      { status: 400, headers }
    );
  const { data, error } = await createAdminClient()
    .from('screenshot_public_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', body.linkId)
    .eq('screenshot_id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data)
    return NextResponse.json(
      { error: 'Could not revoke this link.' },
      { status: 404, headers }
    );
  return NextResponse.json({ ok: true }, { headers });
}
