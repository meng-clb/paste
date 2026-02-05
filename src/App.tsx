import { useState } from 'react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import SyncPanel from './components/SyncPanel';
import LatestCard from './components/LatestCard';
import HistoryList from './components/HistoryList';
import { useAuth } from './hooks/useAuth';
import { useClips } from './hooks/useClips';

export default function App() {
  const { user, loading } = useAuth();
  const { latest, history, startHistory, stopHistory, syncClip } = useClips(user?.uid ?? null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (loading) {
    return <div className="page">Loading...</div>;
  }

  async function handleSync() {
    const result = await syncClip(draft);
    setStatus(result.ok ? 'Synced' : result.error ?? 'Failed');
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setStatus('Copied');
  }

  function toggleHistory() {
    setOpen((prev) => {
      const next = !prev;
      if (next) startHistory();
      else stopHistory();
      return next;
    });
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="eyebrow">Clipboard Bridge</div>
        <h1>Move text across devices in seconds.</h1>
        <p>Paste, sync, and grab the latest clip instantly.</p>
      </header>

      <section className="grid">
        <AuthPanel />
        <SyncPanel
          value={draft}
          status={status}
          onChange={setDraft}
          onSync={handleSync}
          disabled={!user}
        />
        <LatestCard clip={latest} onCopy={handleCopy} />
        <HistoryList
          open={open}
          clips={history}
          onToggle={toggleHistory}
          onCopy={handleCopy}
        />
      </section>
    </div>
  );
}
