import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    await signInWithEmailAndPassword(auth, email, password).catch((e) =>
      setError(e.message)
    );
  }

  async function handleSignUp() {
    setError(null);
    await createUserWithEmailAndPassword(auth, email, password).catch((e) =>
      setError(e.message)
    );
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <div className="card">
      <div className="card-title">Account</div>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="row">
        <button className="btn" onClick={handleSignIn}>
          Sign in
        </button>
        <button className="btn ghost" onClick={handleSignUp}>
          Sign up
        </button>
        <button className="btn ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
      {error && <div className="muted">{error}</div>}
    </div>
  );
}
