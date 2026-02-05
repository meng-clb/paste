import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPanel from './AuthPanel';

const signIn = vi.fn().mockResolvedValue({});

vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signIn(...args),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue({}),
}));

describe('AuthPanel', () => {
  it('signs in with email and password', () => {
    render(<AuthPanel />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signIn).toHaveBeenCalledWith({}, 'a@b.com', 'pw');
  });
});
