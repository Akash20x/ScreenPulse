import Link from 'next/link';
import { signOut } from '@/app/dashboard/actions';
import { SignOutButton } from '@/src/components/sign-out-button';

export function AppNav({ email }: { email?: string }) {
  return (
    <nav className="nav">
      <Link className="brand" href="/dashboard">
        SCREENPULSE
      </Link>
      <div className="nav-links">
        <Link href="/dashboard">Gallery</Link>
        <Link href="/mcp/guide">MCP</Link>
        {email && <span className="muted">{email}</span>}
        <SignOutButton action={signOut} />
      </div>
    </nav>
  );
}
