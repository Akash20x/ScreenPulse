import type { NextRequest } from 'next/server';
import { updateSession } from '@/src/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  if (request.nextUrl.pathname.startsWith('/share/')) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
