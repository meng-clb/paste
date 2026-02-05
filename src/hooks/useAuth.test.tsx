import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

const authMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    callback({ uid: 'user-1' });
    return () => {};
  }),
}));

vi.mock('../lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: authMocks.onAuthStateChanged }));

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>{user ? 'signed-in' : 'signed-out'}</div>;
}

describe('useAuth', () => {
  it('sets user after auth change', async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByText('signed-in')).toBeInTheDocument());
  });
});
