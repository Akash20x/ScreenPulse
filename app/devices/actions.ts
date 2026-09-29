'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/src/lib/auth';
import { createClient } from '@/src/lib/supabase/server';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createDevice(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim().slice(0, 80) || 'Chrome extension';
  const token = `spdt_${randomBytes(32).toString('base64url')}`;
  const supabase = await createClient();
  const { error } = await supabase.from('devices').insert({ user_id: user.id, name, token_hash: hashToken(token) });
  if (error) throw new Error(error.message);
  revalidatePath('/devices');
  return token;
}

export async function revokeDevice(formData: FormData) {
  const id = String(formData.get('deviceId') ?? '');
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from('devices').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).is('revoked_at', null);
  if (error) throw new Error(error.message);
  revalidatePath('/devices');
}
