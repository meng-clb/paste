# Clipboard Sync Web MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vite + React web app that lets users paste text, click Sync, and see the latest clip with a "View more" inline history (last 50) via Firebase Auth + Firestore realtime.

**Architecture:** Single-page React app using Firebase Web SDK. Two Firestore listeners: latest (limit 1, always on) and history (limit 50, on-demand when View more). Client-side normalization + dedupe prevents rapid duplicates.

**Tech Stack:** Vite, React, TypeScript, Firebase Auth, Firestore, Vitest, Testing Library.

### Task 1: Scaffold Vite React App

**Files:**
- Create: package.json, vite.config.ts, tsconfig.json, index.html
- Create: src/main.tsx, src/App.tsx, src/index.css

**Step 1: Run scaffold command**

```bash
cd /Users/ameng/paste/.worktrees/codex/clipboard-web-mvp
npm create vite@latest . -- --template react-ts --force
```

Expected: Vite scaffold files created in the worktree.

**Step 2: Install dependencies**

```bash
npm install
```

Expected: node_modules created, install succeeds.

**Step 3: Build once to confirm baseline**

```bash
npm run build
```

Expected: build completes without errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src

git commit -m "chore: scaffold vite react app"
```

Expected: commit created.

### Task 2: Add Unit Test Tooling

**Files:**
- Modify: package.json
- Create: vitest.config.ts
- Create: src/setupTests.ts

**Step 1: Add dev dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: devDependencies updated.

**Step 2: Add test scripts**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test:unit": "vitest run",
  "test:watch": "vitest"
}
```

**Step 3: Add Vitest config**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

**Step 4: Add test setup**

```ts
import '@testing-library/jest-dom';
```

**Step 5: Run tests (expect none yet)**

```bash
npm run test:unit
```

Expected: Vitest runs with 0 tests and exits 0.

**Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/setupTests.ts

git commit -m "chore: add vitest tooling"
```

Expected: commit created.

### Task 3: Clipboard Utilities (TDD)

**Files:**
- Create: src/lib/clipboard.ts
- Create: src/lib/clipboard.test.ts

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeContent, hashContent, shouldSkipDuplicate } from './clipboard';

describe('normalizeContent', () => {
  it('trims whitespace', () => {
    expect(normalizeContent('  hi  ')).toBe('hi');
  });

  it('returns empty for whitespace-only', () => {
    expect(normalizeContent('   ')).toBe('');
  });

  it('caps length at 20000', () => {
    expect(normalizeContent('a'.repeat(20005)).length).toBe(20000);
  });
});

describe('hashContent', () => {
  it('returns stable hash for same input', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
  });
});

describe('shouldSkipDuplicate', () => {
  it('skips same hash within window', () => {
    expect(shouldSkipDuplicate('h', 'h', 1000, 1500, 2000)).toBe(true);
  });

  it('does not skip when hash differs', () => {
    expect(shouldSkipDuplicate('h1', 'h2', 1000, 1500, 2000)).toBe(false);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
npm run test:unit
```

Expected: FAIL with module/function not found.

**Step 3: Implement clipboard utilities**

```ts
const MAX_LEN = 20000;

export function normalizeContent(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.length > MAX_LEN ? trimmed.slice(0, MAX_LEN) : trimmed;
}

export function hashContent(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export function shouldSkipDuplicate(
  lastHash: string | null,
  nextHash: string,
  lastAtMs: number | null,
  nowMs: number,
  windowMs = 2000
): boolean {
  if (!lastHash || !lastAtMs) return false;
  return lastHash === nextHash && nowMs - lastAtMs <= windowMs;
}
```

**Step 4: Run tests to verify pass**

```bash
npm run test:unit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/clipboard.ts src/lib/clipboard.test.ts

git commit -m "feat: add clipboard normalization and dedupe"
```

Expected: commit created.

### Task 4: Firebase Env + Init (TDD for env parsing)

**Files:**
- Create: .env.example
- Create: src/lib/env.ts
- Create: src/lib/env.test.ts
- Create: src/lib/firebase.ts
- Create: src/types.ts

**Step 1: Write failing tests for env parsing**

```ts
import { describe, it, expect } from 'vitest';
import { readFirebaseEnv } from './env';

describe('readFirebaseEnv', () => {
  it('throws when required keys are missing', () => {
    expect(() => readFirebaseEnv({})).toThrow('VITE_FIREBASE_API_KEY');
  });

  it('returns config when all keys exist', () => {
    const env = {
      VITE_FIREBASE_API_KEY: 'k',
      VITE_FIREBASE_AUTH_DOMAIN: 'd',
      VITE_FIREBASE_PROJECT_ID: 'p',
      VITE_FIREBASE_APP_ID: 'a',
    };
    expect(readFirebaseEnv(env)).toEqual({
      apiKey: 'k',
      authDomain: 'd',
      projectId: 'p',
      appId: 'a',
    });
  });
});
```

**Step 2: Run tests to verify failure**

```bash
npm run test:unit
```

Expected: FAIL with module/function not found.

**Step 3: Implement env parser**

```ts
type Env = Record<string, string | undefined>;

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function readFirebaseEnv(env: Env = import.meta.env): FirebaseEnv {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  };
}
```

**Step 4: Add Firebase init**

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { readFirebaseEnv } from './env';

const config = readFirebaseEnv();

const app = initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Step 5: Add env example**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

**Step 6: Add Clip type**

```ts
export type Clip = {
  id: string;
  content: string;
  hash: string;
  deviceLabel: string;
  createdAt: number | null;
};
```

**Step 7: Run tests to verify pass**

```bash
npm run test:unit
```

Expected: PASS.

**Step 8: Commit**

```bash
git add .env.example src/lib/env.ts src/lib/env.test.ts src/lib/firebase.ts src/types.ts

git commit -m "feat: add firebase env and init"
```

Expected: commit created.

### Task 5: UI Skeleton + Styling (TDD for App render)

**Files:**
- Modify: index.html
- Modify: src/index.css
- Modify: src/App.tsx
- Create: src/App.css
- Create: src/App.test.tsx
- Create: src/components/AuthPanel.tsx
- Create: src/components/SyncPanel.tsx
- Create: src/components/LatestCard.tsx
- Create: src/components/HistoryList.tsx

**Step 1: Write failing App render test**

```ts
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Sync and View more actions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view more/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify failure**

```bash
npm run test:unit
```

Expected: FAIL (App does not render those buttons yet).

**Step 3: Add fonts and base styles**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
```

```css
:root {
  --bg-0: #f4f1ea;
  --bg-1: #e7dfd3;
  --ink: #1c1b1a;
  --muted: #5f5b57;
  --accent: #1a7f6b;
  --accent-2: #c4552d;
  --card: #fffaf2;
  --border: #e6dccd;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--ink);
  background: radial-gradient(1200px 600px at 20% -10%, #fdf7ee 0%, transparent 60%),
              radial-gradient(900px 500px at 110% 10%, #f4e5d6 0%, transparent 55%),
              linear-gradient(180deg, var(--bg-0), var(--bg-1));
  min-height: 100vh;
}
```

**Step 4: Implement App layout and components**

```tsx
import './App.css';
import AuthPanel from './components/AuthPanel';
import SyncPanel from './components/SyncPanel';
import LatestCard from './components/LatestCard';
import HistoryList from './components/HistoryList';

export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <div className="eyebrow">Clipboard Bridge</div>
        <h1>Move text across devices in seconds.</h1>
        <p>Paste, sync, and grab the latest clip instantly.</p>
      </header>

      <section className="grid">
        <AuthPanel />
        <SyncPanel onSync={() => {}} disabled />
        <LatestCard clip={null} />
        <HistoryList open={false} clips={[]} onToggle={() => {}} onCopy={() => {}} />
      </section>
    </div>
  );
}
```

```tsx
export default function SyncPanel({ onSync, disabled }: { onSync: () => void; disabled: boolean }) {
  return (
    <div className="card">
      <div className="card-title">Paste to sync</div>
      <textarea placeholder="Paste your text here" rows={5} />
      <button className="btn" onClick={onSync} disabled={disabled}>Sync</button>
    </div>
  );
}
```

```tsx
export default function HistoryList({ open, clips, onToggle, onCopy }: {
  open: boolean; clips: { id: string; content: string }[]; onToggle: () => void; onCopy: (text: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-row">
        <div className="card-title">History</div>
        <button className="btn ghost" onClick={onToggle}>{open ? 'Hide' : 'View more'}</button>
      </div>
      {open && (
        <ul className="clip-list">
          {clips.map((clip) => (
            <li key={clip.id}>
              <span>{clip.content}</span>
              <button className="btn ghost" onClick={() => onCopy(clip.content)}>Copy</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 5: Run tests to verify pass**

```bash
npm run test:unit
```

Expected: PASS.

**Step 6: Commit**

```bash
git add index.html src/index.css src/App.tsx src/App.css src/App.test.tsx src/components

git commit -m "feat: add UI skeleton and styling"
```

Expected: commit created.

### Task 6: Auth Integration

**Files:**
- Create: src/hooks/useAuth.ts
- Modify: src/components/AuthPanel.tsx
- Modify: src/App.tsx

**Step 1: Implement auth hook**

```ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
```

**Step 2: Wire AuthPanel actions**

```tsx
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    await signInWithEmailAndPassword(auth, email, password).catch((e) => setError(e.message));
  }

  async function handleSignUp() {
    setError(null);
    await createUserWithEmailAndPassword(auth, email, password).catch((e) => setError(e.message));
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <div className="card">
      <div className="card-title">Account</div>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="row">
        <button className="btn" onClick={handleSignIn}>Sign in</button>
        <button className="btn ghost" onClick={handleSignUp}>Sign up</button>
        <button className="btn ghost" onClick={handleSignOut}>Sign out</button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

**Step 3: Use auth state in App**

```tsx
import { useAuth } from './hooks/useAuth';

const { user, loading } = useAuth();
if (loading) return <div className="page">Loading...</div>;
```

**Step 4: Commit**

```bash
git add src/hooks/useAuth.ts src/components/AuthPanel.tsx src/App.tsx

git commit -m "feat: add firebase auth flow"
```

Expected: commit created.

### Task 7: Firestore Sync + View More History

**Files:**
- Create: src/hooks/useClips.ts
- Modify: src/components/SyncPanel.tsx
- Modify: src/components/LatestCard.tsx
- Modify: src/components/HistoryList.tsx
- Modify: src/App.tsx

**Step 1: Implement clips hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clip } from '../types';
import { hashContent, normalizeContent, shouldSkipDuplicate } from '../lib/clipboard';

export function useClips(uid: string | null) {
  const [latest, setLatest] = useState<Clip | null>(null);
  const [history, setHistory] = useState<Clip[]>([]);
  const historyUnsub = useRef<null | (() => void)>(null);
  const lastHash = useRef<string | null>(null);
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'clips'), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      const doc = snap.docs[0];
      if (!doc) return;
      const data = doc.data() as Omit<Clip, 'id'>;
      setLatest({ id: doc.id, ...data, createdAt: data.createdAt ?? null });
    });
  }, [uid]);

  const startHistory = useCallback(() => {
    if (!uid || historyUnsub.current) return;
    const q = query(collection(db, 'users', uid, 'clips'), orderBy('createdAt', 'desc'), limit(50));
    historyUnsub.current = onSnapshot(q, (snap) => {
      const next = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Clip, 'id'>) }));
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

  const syncClip = useCallback(async (content: string) => {
    if (!uid) return { ok: false, error: 'Not signed in' };
    const normalized = normalizeContent(content);
    if (!normalized) return { ok: false, error: 'Empty content' };
    const hash = hashContent(normalized);
    const now = Date.now();
    if (shouldSkipDuplicate(lastHash.current, hash, lastAt.current, now)) {
      return { ok: false, error: 'Duplicate within window' };
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
  }, [uid]);

  return { latest, history, startHistory, stopHistory, syncClip };
}
```

**Step 2: Wire SyncPanel and HistoryList**

```tsx
const { user } = useAuth();
const { latest, history, startHistory, stopHistory, syncClip } = useClips(user?.uid ?? null);

const [open, setOpen] = useState(false);
const [draft, setDraft] = useState('');
const [status, setStatus] = useState<string | null>(null);

async function handleSync() {
  const result = await syncClip(draft);
  setStatus(result.ok ? 'Synced' : result.error ?? 'Failed');
}

function toggleHistory() {
  setOpen((prev) => {
    const next = !prev;
    if (next) startHistory();
    else stopHistory();
    return next;
  });
}
```

**Step 3: Commit**

```bash
git add src/hooks/useClips.ts src/components/SyncPanel.tsx src/components/LatestCard.tsx src/components/HistoryList.tsx src/App.tsx

git commit -m "feat: add firestore sync and history"
```

Expected: commit created.

### Task 8: Copy To Clipboard + UX Polish

**Files:**
- Modify: src/components/LatestCard.tsx
- Modify: src/components/HistoryList.tsx
- Modify: src/App.tsx

**Step 1: Add copy handlers**

```tsx
async function handleCopy(text: string) {
  await navigator.clipboard.writeText(text);
  setStatus('Copied');
}
```

**Step 2: Wire copy buttons**

```tsx
<button className="btn ghost" onClick={() => onCopy(clip.content)}>Copy</button>
```

**Step 3: Commit**

```bash
git add src/components/LatestCard.tsx src/components/HistoryList.tsx src/App.tsx

git commit -m "feat: add copy actions"
```

Expected: commit created.

### Task 9: Docs + Firestore Rules

**Files:**
- Create: README.md
- Create: firestore.rules

**Step 1: Write README**

```md
# Clipboard Sync Web MVP

## Setup
1. Create Firebase project and enable Email/Password auth.
2. Create Firestore database in production or test mode.
3. Copy .env.example to .env and fill in values.
4. Install deps and run dev server.

## Commands
- npm install
- npm run dev
- npm run test:unit

## Notes
- Default view shows latest 1 item.
- "View more" expands recent history (limit 50).
```

**Step 2: Add Firestore rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/clips/{clipId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Step 3: Commit**

```bash
git add README.md firestore.rules

git commit -m "docs: add setup and firestore rules"
```

Expected: commit created.

### Manual Verification Checklist

**Run dev server**

```bash
npm run dev
```

Verify:
- Sign up with email + password works.
- Paste text and click Sync writes a new item.
- Latest card updates within seconds on another tab/device.
- View more expands history list (50 max).
- Copy button writes to clipboard.
