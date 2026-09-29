import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

function destination(next: string | null) {
  return next?.startsWith('/oauth/authorize') ? next : '/dashboard';
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = destination(request.nextUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Missing+authorization+code', request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
