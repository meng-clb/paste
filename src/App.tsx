import { useEffect, useRef, useState } from 'react';
import './App.css';
import { signOut } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import DashboardPage from './components/DashboardPage';
import { useAuth } from './hooks/useAuth';
import { useClips } from './hooks/useClips';
import { useDevicePresence } from './hooks/useDevicePresence';
import { auth } from './lib/firebase';

export default function App() {
  const { user, loading } = useAuth();
  const connectedDeviceCount = useDevicePresence(user?.uid ?? null, user?.email ?? null);
  const { latest, history, startHistory, stopHistory, syncClip, clearHistory, deleteClip } = useClips(
    user?.uid ?? null
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCopyResetTimer() {
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!user) {
      clearCopyResetTimer();
      stopHistory();
      return;
    }
    startHistory();
    return () => stopHistory();
  }, [user, startHistory, stopHistory]);

  useEffect(() => {
    return () => clearCopyResetTimer();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-500">
        加载中...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  async function handleSync() {
    clearCopyResetTimer();
    const result = await syncClip(draft);
    setStatus(result.ok ? '已同步' : result.error ?? '操作失败');
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    clearCopyResetTimer();
    setStatus('已复制');
    copyResetTimerRef.current = setTimeout(() => {
      setStatus((current) => (current === '已复制' ? null : current));
      copyResetTimerRef.current = null;
    }, 2000);
  }

  async function handleSignOut() {
    clearCopyResetTimer();
    await signOut(auth);
    setHistoryModalOpen(false);
    setDraft('');
    setStatus(null);
    stopHistory();
  }

  async function handleClearAll() {
    const result = await clearHistory();
    if (!result.ok) {
      setStatus(result.error);
      return false;
    }
    return true;
  }

  async function handleDeleteClip(clipId: string) {
    const result = await deleteClip(clipId);
    if (!result.ok) {
      setStatus(result.error);
      return false;
    }
    return true;
  }

  return (
    <DashboardPage
      email={user.email ?? '已登录用户'}
      latest={latest}
      history={history}
      connectedDeviceCount={connectedDeviceCount}
      historyModalOpen={historyModalOpen}
      draft={draft}
      status={status}
      onDraftChange={setDraft}
      onSync={handleSync}
      onOpenHistoryModal={() => setHistoryModalOpen(true)}
      onCloseHistoryModal={() => setHistoryModalOpen(false)}
      onCopy={handleCopy}
      onClearAll={handleClearAll}
      onDeleteClip={handleDeleteClip}
      onSignOut={handleSignOut}
    />
  );
}
