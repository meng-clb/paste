import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDevicePresence } from './useDevicePresence';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(() => ({ path: 'mock-collection' })),
  doc: vi.fn(() => ({ path: 'mock-doc' })),
  onSnapshot: vi.fn(),
  query: vi.fn((value: unknown) => value),
  serverTimestamp: vi.fn(() => ({ mock: 'timestamp' })),
  setDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/device', () => ({
  getOrCreateDeviceId: () => 'device-test',
}));
vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  onSnapshot: firestoreMocks.onSnapshot,
  query: firestoreMocks.query,
  serverTimestamp: firestoreMocks.serverTimestamp,
  setDoc: firestoreMocks.setDoc,
}));

function Probe({ uid, email }: { uid: string | null; email: string | null }) {
  const count = useDevicePresence(uid, email);
  return <div data-testid="count">{count}</div>;
}

describe('useDevicePresence', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs current device at login and reads connected device count from devices collection', () => {
    let snapshotCallback: ((snap: { size: number }) => void) | null = null;
    firestoreMocks.onSnapshot.mockImplementation((_query: unknown, callback: (snap: { size: number }) => void) => {
      snapshotCallback = callback;
      callback({ size: 1 });
      return () => {};
    });

    render(<Probe uid="user-1" email="user@example.com" />);

    expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'users', 'user-1', 'devices', 'device-test');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { path: 'mock-doc' },
      expect.objectContaining({
        deviceId: 'device-test',
        deviceLabel: 'web',
        email: 'user@example.com',
        lastSeenAt: { mock: 'timestamp' },
      }),
      { merge: true }
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    act(() => {
      snapshotCallback?.({ size: 2 });
    });
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('falls back to 1 when user is signed out', () => {
    render(<Probe uid={null} email={null} />);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(firestoreMocks.onSnapshot).not.toHaveBeenCalled();
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });
});
