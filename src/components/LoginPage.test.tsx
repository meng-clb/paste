import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

const authMocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  setPersistence: vi.fn().mockResolvedValue(undefined),
  signInWithPopup: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn(),
  browserLocalPersistence: { mode: 'local' },
  browserSessionPersistence: { mode: 'session' },
}));

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  sendPasswordResetEmail: authMocks.sendPasswordResetEmail,
  setPersistence: authMocks.setPersistence,
  signInWithPopup: authMocks.signInWithPopup,
  GoogleAuthProvider: authMocks.GoogleAuthProvider,
  browserLocalPersistence: authMocks.browserLocalPersistence,
  browserSessionPersistence: authMocks.browserSessionPersistence,
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

describe('LoginPage forgot password', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the glassmorphism login shell', () => {
    render(<LoginPage />);

    expect(screen.getByTestId('login-glass-card')).toBeInTheDocument();
    expect(screen.getByLabelText(/在此设备记住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apple/i })).not.toBeInTheDocument();
  });

  it('sends password reset email when forgot password is clicked', () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/邮箱地址/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /忘记密码/i }));

    expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledWith({}, 'a@b.com');
  });

  it('signs in with Google provider and local persistence when remember me is checked', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByLabelText(/在此设备记住我/i));
    fireEvent.click(screen.getByRole('button', { name: /Google/i }));

    await waitFor(() => {
      expect(authMocks.GoogleAuthProvider).toHaveBeenCalledTimes(1);
      expect(authMocks.setPersistence).toHaveBeenCalledWith({}, authMocks.browserLocalPersistence);
      expect(authMocks.signInWithPopup).toHaveBeenCalledTimes(1);
    });
  });
});
