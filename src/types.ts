import type { Timestamp } from 'firebase/firestore';

export type Clip = {
  id: string;
  content: string;
  hash: string;
  deviceLabel: string;
  deviceId?: string;
  createdAt: Timestamp | null;
};
