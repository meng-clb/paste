import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LoginPage from './LoginPage';

const authMocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  sendPasswordResetEmail: authMocks.sendPasswordResetEmail,
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
  });

  it('sends password reset email when forgot password is clicked', () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/邮箱地址/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /忘记密码/i }));

    expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledWith({}, 'a@b.com');
  });
});
