import Link from 'next/link';
import { signIn, signInWithGoogle } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const { error, message, next } = await searchParams;
  const safeNext = next?.startsWith('/oauth/authorize') ? next : '';
  return <main className="auth panel stack"><div><p className="brand">SCREENPULSE</p><h1>Welcome back</h1><p className="muted">Sign in to view your private timeline.</p></div>{error && <p className="error">{error}</p>}{message && <p className="flash">{message}</p>}<form action={signInWithGoogle}><input name="next" type="hidden" value={safeNext} /><button className="google-button" type="submit"><span aria-hidden="true">G</span>Continue with Google</button></form><div className="auth-divider" aria-hidden="true">or</div><form action={signIn} className="stack"><input name="next" type="hidden" value={safeNext} /><label>Email<input required name="email" type="email" autoComplete="email" /></label><label>Password<input required name="password" type="password" autoComplete="current-password" /></label><button type="submit">Sign in</button></form><p className="muted">New here? <Link href="/signup">Create an account</Link>.</p></main>;
}
