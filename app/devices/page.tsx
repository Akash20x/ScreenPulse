import { AppNav } from '@/src/components/app-nav';
import { CreateDeviceForm, RevokeDeviceButton } from '@/src/components/device-forms';
import { requireUser } from '@/src/lib/auth';
import { createClient } from '@/src/lib/supabase/server';

export default async function Devices() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: devices, error } = await supabase.from('devices').select('id,name,created_at,revoked_at').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return <main className="shell"><AppNav email={user.email} /><header className="header"><div><p className="brand">EXTENSION ACCESS</p><h1>Devices</h1><p className="muted">Each token grants one extension permission to upload screenshots for your account.</p></div></header><div className="stack"><CreateDeviceForm /><section className="panel"><h2>Your device tokens</h2>{devices?.length ? <div className="stack">{devices.map((device) => <div className="actions" key={device.id}><strong>{device.name}</strong><span className="muted">Created {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(device.created_at))}</span>{device.revoked_at ? <span className="error">Revoked</span> : <RevokeDeviceButton id={device.id} />}</div>)}</div> : <p className="muted">No devices yet.</p>}</section></div></main>;
}
