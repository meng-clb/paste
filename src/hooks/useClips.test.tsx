import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useClips } from './useClips';
import { hashContent } from '../lib/clipboard';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'doc-1' }),
  collection: vi.fn(() => ({ path: 'mock-collection' })),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => ({ mock: 'timestamp' })),
}));

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: firestoreMocks.collection,
  query: firestoreMocks.query,
  orderBy: firestoreMocks.orderBy,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  serverTimestamp: firestoreMocks.serverTimestamp,
}));

let current: ReturnType<typeof useClips> | null = null;

function Probe({ uid }: { uid: string | null }) {
  current = useClips(uid);
  return null;
}

describe('useClips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects sync when not signed in', async () => {
    render(<Probe uid={null} />);
    const result = await current!.syncClip('hello');
    expect(result.ok).toBe(false);
  });

  it('adds a normalized clip for signed in user', async () => {
    render(<Probe uid="user-1" />);
    const result = await current!.syncClip('hello');
    expect(result.ok).toBe(true);
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      { path: 'mock-collection' },
      expect.objectContaining({
        content: 'hello',
        hash: hashContent('hello'),
        deviceLabel: 'web',
        createdAt: { mock: 'timestamp' },
      })
    );
  });
});
