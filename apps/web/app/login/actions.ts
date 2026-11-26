'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.startsWith('/oauth/authorize') ? value : '/dashboard';
}
function message(error: string, next: string) { return `/login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(next)}`; }

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(message(error.message, next));
  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get('next'));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) redirect(message('Google sign-in is not configured.', next));

  const callbackUrl = new URL('/auth/callback', appUrl);
  callbackUrl.searchParams.set('next', next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) redirect(message(error?.message ?? 'Unable to start Google sign-in.', next));
  redirect(data.url);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) redirect(message(createError.message, next));

  // Establish the browser session immediately after creating the confirmed account.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect(message(signInError.message, next));
  redirect(next);
}
