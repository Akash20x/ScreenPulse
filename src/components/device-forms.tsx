'use client';

import { useState, useTransition } from 'react';
import { createDevice, revokeDevice } from '@/app/devices/actions';

export function CreateDeviceForm() {
  const [token, setToken] = useState<string>();
  const [pending, startTransition] = useTransition();
  return <section className="panel stack"><div><h2>Connect a device</h2><p className="muted">Create a token, copy it to the extension, then keep it private. It is only shown once.</p></div><form className="inline-form" action={(data) => startTransition(async () => setToken(await createDevice(data)))}><input aria-label="Device name" defaultValue="My Chrome" name="name" maxLength={80} /><button disabled={pending} type="submit">Create device token</button></form>{token && <div className="stack"><p className="flash">Copy this token now; ScreenPulse cannot show it again.</p><input aria-label="New device token" readOnly value={token} onFocus={(event) => event.currentTarget.select()} /></div>}</section>;
}

export function RevokeDeviceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return <form action={(data) => startTransition(async () => { await revokeDevice(data); })}><input name="deviceId" type="hidden" value={id} /><button className="secondary" disabled={pending} type="submit">Revoke</button></form>;
}
