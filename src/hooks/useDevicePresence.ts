import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getOrCreateDeviceId } from '../lib/device';

const HEARTBEAT_INTERVAL_MS = 60_000;

export function useDevicePresence(uid: string | null, email: string | null) {
  const [connectedDeviceCount, setConnectedDeviceCount] = useState(1);
  const deviceId = useRef(getOrCreateDeviceId());

  useEffect(() => {
    if (!uid) {
      setConnectedDeviceCount(1);
      return;
    }

    const deviceRef = doc(db, 'users', uid, 'devices', deviceId.current);
    const syncPresence = () =>
      setDoc(
        deviceRef,
        {
          deviceId: deviceId.current,
          deviceLabel: 'web',
          email: email ?? null,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => undefined);

    void syncPresence();

    const snapshotUnsub = onSnapshot(
      query(collection(db, 'users', uid, 'devices')),
      (snap) => {
        setConnectedDeviceCount(Math.max(snap.size, 1));
      },
      () => {
        setConnectedDeviceCount(1);
      }
    );

    const heartbeatTimer = window.setInterval(() => {
      void syncPresence();
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      snapshotUnsub();
    };
  }, [uid, email]);

  return connectedDeviceCount;
}
