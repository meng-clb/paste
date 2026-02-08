import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useClips } from './useClips';
import { hashContent } from '../lib/clipboard';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'doc-1' }),
  collection: vi.fn(() => ({ path: 'mock-collection' })),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn(() => ({ path: 'mock-doc' })),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => ({ mock: 'timestamp' })),
  writeBatch: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: firestoreMocks.collection,
  deleteDoc: firestoreMocks.deleteDoc,
  doc: firestoreMocks.doc,
  getDocs: firestoreMocks.getDocs,
  query: firestoreMocks.query,
  orderBy: firestoreMocks.orderBy,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  serverTimestamp: firestoreMocks.serverTimestamp,
  writeBatch: firestoreMocks.writeBatch,
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

  it('clears all clips for signed in user', async () => {
    const batchDelete = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    firestoreMocks.writeBatch.mockReturnValue({
      delete: batchDelete,
      commit: batchCommit,
    });
    firestoreMocks.getDocs
      .mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [{ ref: { id: 'clip-1' } }, { ref: { id: 'clip-2' } }],
      });

    render(<Probe uid="user-1" />);
    const result = await current!.clearHistory();

    expect(result.ok).toBe(true);
    expect(firestoreMocks.getDocs).toHaveBeenCalledTimes(1);
    expect(batchDelete).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('deletes one clip for signed in user', async () => {
    render(<Probe uid="user-1" />);
    const result = await current!.deleteClip('clip-3');

    expect(result.ok).toBe(true);
    expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'users', 'user-1', 'clips', 'clip-3');
    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith({ path: 'mock-doc' });
  });
});
