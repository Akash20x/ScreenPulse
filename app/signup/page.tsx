import Link from 'next/link';
import { signUp, signInWithGoogle } from '../login/actions';

export default function SignUp() {
  return <main className="auth panel stack"><div><p className="brand">SCREENPULSE</p><h1>Create your account</h1><p className="muted">Your screenshots stay private to you.</p></div><form action={signInWithGoogle}><button className="google-button" type="submit"><span aria-hidden="true">G</span>Continue with Google</button></form><div className="auth-divider" aria-hidden="true">or</div><form action={signUp} className="stack"><label>Email<input required name="email" type="email" autoComplete="email" /></label><label>Password<input required minLength={8} name="password" type="password" autoComplete="new-password" /></label><button type="submit">Create account</button></form><p className="muted">Already have an account? <Link href="/login">Sign in</Link>.</p></main>;
}
