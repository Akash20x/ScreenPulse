import Link from 'next/link';
import { signOut } from '@/app/dashboard/actions';

export function AppNav({ email }: { email?: string }) {
  return <nav className="nav"><Link className="brand" href="/dashboard">SCREENPULSE</Link><div className="nav-links"><Link href="/dashboard">Gallery</Link><Link href="/devices">Devices</Link><Link href="/mcp/guide">MCP</Link>{email && <span className="muted">{email}</span>}<form action={signOut}><button className="secondary" type="submit">Sign out</button></form></div></nav>;
}
