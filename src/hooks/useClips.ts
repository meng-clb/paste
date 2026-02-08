import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Clip } from '../types';
import { hashContent, normalizeContent, shouldSkipDuplicate } from '../lib/clipboard';

type SyncResult = { ok: true } | { ok: false; error: string };

export function useClips(uid: string | null) {
  const [latest, setLatest] = useState<Clip | null>(null);
  const [history, setHistory] = useState<Clip[]>([]);
  const historyUnsub = useRef<null | (() => void)>(null);
  const lastHash = useRef<string | null>(null);
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    if (!uid) {
      setLatest(null);
      return;
    }
    const q = query(
      collection(db, 'users', uid, 'clips'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snap) => {
      const doc = snap.docs[0];
      if (!doc) {
        setLatest(null);
        return;
      }
      const data = doc.data() as Omit<Clip, 'id'>;
      setLatest({ id: doc.id, ...data, createdAt: data.createdAt ?? null });
    });
  }, [uid]);

  const startHistory = useCallback(() => {
    if (!uid || historyUnsub.current) return;
    const q = query(
      collection(db, 'users', uid, 'clips'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    historyUnsub.current = onSnapshot(q, (snap) => {
      const next = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Clip, 'id'>),
      }));
      setHistory(next);
    });
  }, [uid]);

  const stopHistory = useCallback(() => {
    if (historyUnsub.current) {
      historyUnsub.current();
      historyUnsub.current = null;
      setHistory([]);
    }
  }, []);

  const syncClip = useCallback(
    async (content: string): Promise<SyncResult> => {
      if (!uid) return { ok: false, error: '未登录' };
      const normalized = normalizeContent(content);
      if (!normalized) return { ok: false, error: '内容不能为空' };
      const hash = hashContent(normalized);
      const now = Date.now();
      if (shouldSkipDuplicate(lastHash.current, hash, lastAt.current, now)) {
        return { ok: false, error: '短时间内重复内容' };
      }
      lastHash.current = hash;
      lastAt.current = now;
      await addDoc(collection(db, 'users', uid, 'clips'), {
        content: normalized,
        hash,
        deviceLabel: 'web',
        createdAt: serverTimestamp(),
      });
      return { ok: true };
    },
    [uid]
  );

  const clearHistory = useCallback(async (): Promise<SyncResult> => {
    if (!uid) return { ok: false, error: '未登录' };
    try {
      const clipsRef = collection(db, 'users', uid, 'clips');
      while (true) {
        const snap = await getDocs(query(clipsRef, limit(500)));
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.docs.forEach((clipDoc) => {
          batch.delete(clipDoc.ref);
        });
        await batch.commit();

        if (snap.size < 500) break;
      }

      lastHash.current = null;
      lastAt.current = null;
      setLatest(null);
      setHistory([]);
      return { ok: true };
    } catch {
      return { ok: false, error: '清空历史失败' };
    }
  }, [uid]);

  const deleteClip = useCallback(
    async (clipId: string): Promise<SyncResult> => {
      if (!uid) return { ok: false, error: '未登录' };
      try {
        await deleteDoc(doc(db, 'users', uid, 'clips', clipId));
        return { ok: true };
      } catch {
        return { ok: false, error: '删除记录失败' };
      }
    },
    [uid]
  );

  return { latest, history, startHistory, stopHistory, syncClip, clearHistory, deleteClip };
}
