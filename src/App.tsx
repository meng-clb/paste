import './App.css';
import AuthPanel from './components/AuthPanel';
import SyncPanel from './components/SyncPanel';
import LatestCard from './components/LatestCard';
import HistoryList from './components/HistoryList';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="page">Loading...</div>;
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
        <SyncPanel onSync={() => {}} disabled />
        <LatestCard clip={null} />
        <HistoryList open={false} clips={[]} onToggle={() => {}} onCopy={() => {}} />
      </section>
    </div>
  );
}
