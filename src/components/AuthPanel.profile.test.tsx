import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPanel from './AuthPanel';

const signUp = vi.fn().mockResolvedValue({
  user: {
    uid: 'user-1',
    email: 'a@b.com',
    metadata: { creationTime: '2026-02-05T00:00:00.000Z' },
  },
});
const signIn = vi.fn().mockResolvedValue({});
const signOut = vi.fn().mockResolvedValue({});
const setDoc = vi.fn().mockResolvedValue(undefined);
const docRef = { path: 'users/user-1' };

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => signUp(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => signIn(...args),
  signOut: (...args: unknown[]) => signOut(...args),
}));
vi.mock('firebase/firestore', () => ({
  doc: () => docRef,
  setDoc: (...args: unknown[]) => setDoc(...args),
}));

describe('AuthPanel profile write', () => {
  it('writes profile on sign up', async () => {
    render(<AuthPanel />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    expect(setDoc).toHaveBeenCalledWith(
      docRef,
      {
        email: 'a@b.com',
        createdAt: '2026-02-05T00:00:00.000Z',
      },
      { merge: true }
    );
  });
});
