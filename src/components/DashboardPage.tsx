import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Clip } from '../types';

type DashboardPageProps = {
  email: string;
  latest: Clip | null;
  history: Clip[];
  historyModalOpen: boolean;
  draft: string;
  status: string | null;
  onDraftChange: (next: string) => void;
  onSync: () => void;
  onOpenHistoryModal: () => void;
  onCloseHistoryModal: () => void;
  onCopy: (text: string) => void;
  onClearAll: () => Promise<boolean>;
  onDeleteClip: (clipId: string) => Promise<boolean>;
  onSignOut: () => void;
};

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
}

function clipDate(clip: Clip | null): Date | null {
  if (!clip?.createdAt || typeof clip.createdAt !== 'object' || !('toDate' in clip.createdAt)) {
    return null;
  }
  return clip.createdAt.toDate();
}

function formatLatestTime(clip: Clip | null) {
  if (!clip) return '刚刚';
  return formatHistoryTime(clip);
}

function formatHistoryTime(clip: Clip) {
  const date = clipDate(clip);
  if (!date) return '刚刚';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return '刚刚';
  if (diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diffMs / (60 * 1000)))} 分钟前`;
  if (diffMs < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diffMs / (60 * 60 * 1000))} 小时前`;
  }
  return date.toLocaleDateString();
}

function toggleSetValue(set: Set<string>, value: string) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

type TooltipState = {
  key: string;
  content: string;
  style: CSSProperties;
};

const MAIN_HISTORY_ROW_GAP_PX = 12;
const TOOLTIP_VIEWPORT_PADDING_PX = 12;
const TOOLTIP_GAP_PX = 8;
const TOOLTIP_MAX_WIDTH_PX = 420;
const TOOLTIP_MAX_HEIGHT_PX = 220;
const TOOLTIP_MIN_HEIGHT_PX = 96;
const TOOLTIP_SHOW_DELAY_MS = 500;
const TOOLTIP_HIDE_DELAY_MS = 420;

export default function DashboardPage({
  email,
  latest,
  history,
  historyModalOpen,
  draft,
  status,
  onDraftChange,
  onSync,
  onOpenHistoryModal,
  onCloseHistoryModal,
  onCopy,
  onClearAll,
  onDeleteClip,
  onSignOut,
}: DashboardPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [recentCopiedId, setRecentCopiedId] = useState<string | null>(null);
  const [historyCopiedId, setHistoryCopiedId] = useState<string | null>(null);
  const [modalCopiedId, setModalCopiedId] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainHistoryListRef = useRef<HTMLDivElement | null>(null);
  const mainHistoryRowHeightRef = useRef(92);
  const [mainHistoryVisibleCount, setMainHistoryVisibleCount] = useState<number>(Number.MAX_SAFE_INTEGER);

  const visibleHistory = useMemo(
    () => history.filter((clip) => !hiddenIds.has(clip.id)),
    [history, hiddenIds]
  );

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visibleHistory;
    return visibleHistory.filter((clip) => clip.content.toLowerCase().includes(query));
  }, [visibleHistory, searchQuery]);

  const modalHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 1 : 0;
      const bPinned = pinnedIds.has(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [filteredHistory, pinnedIds]);

  const mainHistory = useMemo(() => {
    if (!latest) return visibleHistory;
    return visibleHistory.filter((clip) => clip.id !== latest.id);
  }, [visibleHistory, latest]);
  const visibleMainHistory = useMemo(() => {
    const count = Math.max(0, Math.min(mainHistory.length, mainHistoryVisibleCount));
    return mainHistory.slice(0, count);
  }, [mainHistory, mainHistoryVisibleCount]);

  const totalClips = Math.max(visibleHistory.length, latest ? 1 : 0);
  const syncStatus = status === '已复制' ? null : status;
  const storageUsedKb = Math.max(
    0.1,
    (draft.length +
      (latest?.content.length ?? 0) +
      visibleHistory.reduce((sum, clip) => sum + clip.content.length, 0)) /
      1024
  );

  async function handleClearAll() {
    const idsToHide = visibleHistory.map((clip) => clip.id);
    setHiddenIds((prev) => {
      const next = new Set(prev);
      idsToHide.forEach((id) => next.add(id));
      return next;
    });
    setSearchQuery('');
    setPinnedIds(new Set());
    setHistoryCopiedId(null);
    setModalCopiedId(null);
    if (historyCopiedTimerRef.current) {
      clearTimeout(historyCopiedTimerRef.current);
      historyCopiedTimerRef.current = null;
    }
    if (modalCopiedTimerRef.current) {
      clearTimeout(modalCopiedTimerRef.current);
      modalCopiedTimerRef.current = null;
    }

    const ok = await onClearAll();
    if (!ok) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        idsToHide.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  function handleModalCopy(clip: Clip) {
    onCopy(clip.content);
    setModalCopiedId(clip.id);
    if (modalCopiedTimerRef.current) clearTimeout(modalCopiedTimerRef.current);
    modalCopiedTimerRef.current = setTimeout(() => {
      setModalCopiedId((current) => (current === clip.id ? null : current));
      modalCopiedTimerRef.current = null;
    }, 1000);
  }

  function handleRecentCopy(clip: Clip) {
    onCopy(clip.content);
    setRecentCopiedId(clip.id);
    if (recentCopiedTimerRef.current) clearTimeout(recentCopiedTimerRef.current);
    recentCopiedTimerRef.current = setTimeout(() => {
      setRecentCopiedId((current) => (current === clip.id ? null : current));
      recentCopiedTimerRef.current = null;
    }, 1000);
  }

  function handleHistoryCopy(clip: Clip) {
    onCopy(clip.content);
    setHistoryCopiedId(clip.id);
    if (historyCopiedTimerRef.current) clearTimeout(historyCopiedTimerRef.current);
    historyCopiedTimerRef.current = setTimeout(() => {
      setHistoryCopiedId((current) => (current === clip.id ? null : current));
      historyCopiedTimerRef.current = null;
    }, 1000);
  }

  async function handleDeleteClip(clip: Clip) {
    const wasPinned = pinnedIds.has(clip.id);
    setHiddenIds((prev) => {
      if (prev.has(clip.id)) return prev;
      const next = new Set(prev);
      next.add(clip.id);
      return next;
    });
    setPinnedIds((prev) => {
      if (!prev.has(clip.id)) return prev;
      const next = new Set(prev);
      next.delete(clip.id);
      return next;
    });
    setModalCopiedId((current) => (current === clip.id ? null : current));
    setHistoryCopiedId((current) => (current === clip.id ? null : current));
    setTooltip((current) => (current ? null : current));

    const ok = await onDeleteClip(clip.id);
    if (ok) return;

    setHiddenIds((prev) => {
      if (!prev.has(clip.id)) return prev;
      const next = new Set(prev);
      next.delete(clip.id);
      return next;
    });
    if (wasPinned) {
      setPinnedIds((prev) => {
        if (prev.has(clip.id)) return prev;
        const next = new Set(prev);
        next.add(clip.id);
        return next;
      });
    }
  }

  function clearTooltipTimer() {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }

  function clearTooltipHideTimer() {
    if (tooltipHideTimerRef.current) {
      clearTimeout(tooltipHideTimerRef.current);
      tooltipHideTimerRef.current = null;
    }
  }

  function isRowContentTruncated(rowElement: HTMLElement) {
    const contentElement = rowElement.querySelector<HTMLElement>('[data-tooltip-content="true"]');
    if (!contentElement) return false;

    const verticalOverflow = contentElement.scrollHeight - contentElement.clientHeight > 1;
    const horizontalOverflow = contentElement.scrollWidth - contentElement.clientWidth > 1;
    return verticalOverflow || horizontalOverflow;
  }

  function computeTooltipStyle(anchorRect: DOMRect): CSSProperties {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(TOOLTIP_MAX_WIDTH_PX, viewportWidth - TOOLTIP_VIEWPORT_PADDING_PX * 2);
    const rawLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
    const left = Math.min(
      Math.max(rawLeft, TOOLTIP_VIEWPORT_PADDING_PX),
      viewportWidth - width - TOOLTIP_VIEWPORT_PADDING_PX
    );

    const availableBelow =
      viewportHeight - anchorRect.bottom - TOOLTIP_GAP_PX - TOOLTIP_VIEWPORT_PADDING_PX;
    const maxHeight = Math.max(
      TOOLTIP_MIN_HEIGHT_PX,
      Math.min(TOOLTIP_MAX_HEIGHT_PX, availableBelow > 0 ? availableBelow : TOOLTIP_MIN_HEIGHT_PX)
    );
    const rawTop = anchorRect.bottom + TOOLTIP_GAP_PX;
    const top = Math.min(
      Math.max(rawTop, TOOLTIP_VIEWPORT_PADDING_PX),
      viewportHeight - TOOLTIP_VIEWPORT_PADDING_PX - maxHeight
    );

    return {
      left,
      top,
      width,
      maxHeight,
    };
  }

  function showDelayedTooltip(key: string, content: string, rowElement: HTMLElement) {
    clearTooltipTimer();
    clearTooltipHideTimer();
    setTooltip(null);

    if (!isRowContentTruncated(rowElement)) return;

    tooltipTimerRef.current = setTimeout(() => {
      if (!rowElement.isConnected) return;
      setTooltip({
        key,
        content,
        style: computeTooltipStyle(rowElement.getBoundingClientRect()),
      });
      tooltipTimerRef.current = null;
    }, TOOLTIP_SHOW_DELAY_MS);
  }

  function scheduleTooltipHide() {
    clearTooltipTimer();
    clearTooltipHideTimer();
    tooltipHideTimerRef.current = setTimeout(() => {
      setTooltip(null);
      tooltipHideTimerRef.current = null;
    }, TOOLTIP_HIDE_DELAY_MS);
  }

  function recalculateMainHistoryVisibleCount() {
    const listElement = mainHistoryListRef.current;
    if (!listElement) return;

    const firstRow = listElement.querySelector<HTMLElement>('[data-main-history-row="true"]');
    if (firstRow && firstRow.offsetHeight > 0) {
      mainHistoryRowHeightRef.current = firstRow.offsetHeight;
    }

    const rowHeight = mainHistoryRowHeightRef.current;
    const availableHeight = listElement.clientHeight;
    if (availableHeight <= 0 || rowHeight <= 0) {
      setMainHistoryVisibleCount((prev) => (prev === mainHistory.length ? prev : mainHistory.length));
      return;
    }

    const count = Math.floor(
      (availableHeight + MAIN_HISTORY_ROW_GAP_PX) / (rowHeight + MAIN_HISTORY_ROW_GAP_PX)
    );
    const boundedCount = Math.max(0, Math.min(mainHistory.length, count));
    setMainHistoryVisibleCount((prev) => (prev === boundedCount ? prev : boundedCount));
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!accountMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setRecentCopiedId(null);
    if (recentCopiedTimerRef.current) {
      clearTimeout(recentCopiedTimerRef.current);
      recentCopiedTimerRef.current = null;
    }
  }, [latest?.id]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      recalculateMainHistoryVisibleCount();
    });
    const handleResize = () => {
      recalculateMainHistoryVisibleCount();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mainHistory, historyCopiedId]);

  useEffect(() => {
    if (!historyModalOpen) {
      setModalCopiedId(null);
      setTooltip(null);
      if (modalCopiedTimerRef.current) {
        clearTimeout(modalCopiedTimerRef.current);
        modalCopiedTimerRef.current = null;
      }
      return;
    }

    setAccountMenuOpen(false);

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [historyModalOpen]);

  useEffect(() => {
    return () => {
      clearTooltipTimer();
      clearTooltipHideTimer();
      if (recentCopiedTimerRef.current) clearTimeout(recentCopiedTimerRef.current);
      if (historyCopiedTimerRef.current) clearTimeout(historyCopiedTimerRef.current);
      if (modalCopiedTimerRef.current) clearTimeout(modalCopiedTimerRef.current);
    };
  }, []);

  return (
    <div
      data-testid="dashboard-root"
      className="syncclip-login relative isolate overflow-hidden overflow-x-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-slate-100 h-screen h-[100dvh] md:h-screen transition-colors duration-300 flex flex-col"
    >
      <div
        data-testid="dashboard-bg-shape-1"
        className="syncclip-floating-shape bg-blue-400 w-80 h-80 -top-16 -left-14"
      />
      <div
        data-testid="dashboard-bg-shape-2"
        className="syncclip-floating-shape bg-indigo-400 w-[420px] h-[420px] -bottom-24 -right-24"
      />
      <div className="syncclip-floating-shape bg-pink-300 w-72 h-72 top-1/4 left-1/2" />

      <div
        className={`${historyModalOpen ? 'blur-sm pointer-events-none select-none' : ''} relative z-10 h-full flex flex-col`}
      >
        <nav className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              剪贴板桥
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              <span className="material-symbols-outlined dark:hidden">dark_mode</span>
              <span className="material-symbols-outlined hidden dark:block">light_mode</span>
            </button>

            <div ref={accountMenuRef} className="flex items-center gap-3 relative">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">用户账户</p>
                <p className="text-xs text-slate-500">{email}</p>
              </div>
              <button
                type="button"
                aria-label="账户菜单"
                aria-expanded={accountMenuOpen}
                className="bg-card-light dark:bg-card-dark p-3 rounded-full border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all"
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <span className="material-symbols-outlined block">person</span>
              </button>
              <div
                data-testid="account-menu-panel"
                hidden={!accountMenuOpen}
                className={`absolute right-0 top-full mt-2 w-48 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all z-10 ${accountMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div className="p-2">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      void onSignOut();
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3 flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden">
          <header className="mb-4 shrink-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 leading-tight">
              跨设备传文本，只需几秒。
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
              粘贴、同步、立即获取最新剪贴内容。
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch lg:flex-1 lg:min-h-0">
            <div className="lg:col-span-7">
              <div className="syncclip-glass-card p-4 md:p-5 rounded-lg lg:h-full flex flex-col">
                <h2 className="text-xl font-bold mb-3">粘贴并同步</h2>
                <textarea
                  className="w-full p-4 mono-text text-sm sm:text-base min-h-[180px] lg:min-h-0 flex-grow rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none transition-all dark:placeholder-slate-600"
                  placeholder="在这里粘贴文本..."
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    className="bg-primary hover:bg-opacity-90 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2"
                    onClick={onSync}
                  >
                    <span className="material-symbols-outlined text-sm font-bold">sync</span>
                    同步
                  </button>
                  {syncStatus && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">{syncStatus}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 lg:min-h-0">
              <div className="syncclip-glass-card p-4 md:p-5 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">最近记录</h2>
                  <span className="text-xs uppercase tracking-widest text-slate-400">
                    {formatLatestTime(latest)}
                  </span>
                </div>

                {latest ? (
                  <button
                    type="button"
                    aria-label={`打开剪贴内容 ${latest.content}`}
                    className="syncclip-lift-row w-full relative flex items-center justify-between p-3 cursor-pointer group text-left"
                    onMouseEnter={(event) =>
                      showDelayedTooltip(`recent-${latest.id}`, latest.content, event.currentTarget)
                    }
                    onMouseLeave={scheduleTooltipHide}
                    onClick={() => handleRecentCopy(latest)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                        history
                      </span>
                      <div className="min-w-0">
                        <p
                          data-tooltip-content="true"
                          className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words leading-snug [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
                        >
                          {latest.content}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-slate-400">{formatLatestTime(latest)}</p>
                          {recentCopiedId === latest.id && (
                            <span
                              data-testid="recent-copy-hint"
                              className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-primary text-[10px] font-bold rounded-full"
                            >
                              已复制到剪贴板！
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    暂无剪贴内容，先同步一条开始使用。
                  </p>
                )}
              </div>

              <div className="syncclip-glass-card p-4 md:p-5 rounded-lg lg:flex-grow lg:min-h-0 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold">历史记录</h2>
                  <button
                    className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={onOpenHistoryModal}
                  >
                    查看全部
                  </button>
                </div>

                {mainHistory.length > 0 ? (
                  <div
                    data-testid="main-history-list"
                    ref={mainHistoryListRef}
                    className="min-h-0 flex-1 overflow-hidden pr-1"
                  >
                    <div className="space-y-3">
                      {visibleMainHistory.map((clip) => (
                        <button
                          type="button"
                          key={clip.id}
                          data-main-history-row="true"
                          aria-label={`打开剪贴内容 ${clip.content}`}
                          className="syncclip-lift-row w-full relative flex items-center justify-between p-3 cursor-pointer group text-left"
                          onMouseEnter={(event) =>
                            showDelayedTooltip(`preview-${clip.id}`, clip.content, event.currentTarget)
                          }
                          onMouseLeave={scheduleTooltipHide}
                          onClick={() => handleHistoryCopy(clip)}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                              history
                            </span>
                            <div className="min-w-0">
                              <p
                                data-tooltip-content="true"
                                className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words leading-snug [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
                              >
                                {clip.content}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-xs text-slate-400">{formatHistoryTime(clip)}</p>
                                {historyCopiedId === clip.id && (
                                  <span
                                    data-testid="history-copy-hint"
                                    className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-primary text-[10px] font-bold rounded-full"
                                  >
                                    已复制到剪贴板！
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {visibleMainHistory.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        当前窗口高度不足，无法完整展示历史记录。
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">暂无历史记录。</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 shrink-0 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="syncclip-glass-card p-3 md:p-4 rounded-lg md:col-span-3 flex flex-wrap sm:flex-nowrap items-center justify-around text-center gap-3 sm:gap-0">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{totalClips}</p>
                <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">总剪贴数</p>
              </div>
              <div className="hidden sm:block h-12 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-2xl md:text-3xl font-bold text-primary">1</p>
                <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">已连接设备</p>
              </div>
              <div className="hidden sm:block h-12 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{`${storageUsedKb.toFixed(1)}KB`}</p>
                <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">已用存储</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:pb-2 border-t border-slate-200/70 dark:border-slate-800/70 text-center shrink-0">
          <p className="text-[11px] text-slate-400">© 2026 剪贴板桥。随时随地同步内容。</p>
        </footer>
      </div>

      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="全部历史"
            className="bg-card-light dark:bg-card-dark w-full max-w-2xl h-[88dvh] sm:h-[80vh] rounded-lg shadow-2xl border border-slate-200/50 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">全部历史</h2>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-full transition-colors"
                    onClick={handleClearAll}
                  >
                    清空全部
                  </button>
                  <button
                    type="button"
                    aria-label="关闭历史弹窗"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    onClick={onCloseHistoryModal}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  search
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all"
                  placeholder="搜索历史记录..."
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            <div
              data-testid="history-modal-list"
              className="flex-grow min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-4"
            >
              {modalHistory.length > 0 ? (
                modalHistory.map((clip) => {
                  const pinned = pinnedIds.has(clip.id);
                  return (
                    <div
                      key={`modal-${clip.id}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`打开剪贴内容 ${clip.content}`}
                      className="syncclip-lift-row w-full relative group p-4 cursor-pointer text-left"
                      onMouseEnter={(event) =>
                        showDelayedTooltip(`modal-${clip.id}`, clip.content, event.currentTarget)
                      }
                      onMouseLeave={scheduleTooltipHide}
                      onClick={() => handleModalCopy(clip)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleModalCopy(clip);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow overflow-hidden">
                          <p
                            data-tooltip-content="true"
                            className="mono-text text-sm text-slate-700 dark:text-slate-300 mb-2"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {clip.content}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400">
                              {formatHistoryTime(clip)}
                            </span>
                            {modalCopiedId === clip.id && (
                              <span
                                data-testid="modal-copy-hint"
                                className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-primary text-[10px] font-bold rounded-full"
                              >
                                已复制到剪贴板！
                              </span>
                            )}
                            {pinned && (
                              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-primary text-[10px] font-bold rounded-full">
                                已置顶
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`切换置顶 ${clip.content}`}
                            className={`p-2 rounded-full transition-colors ${pinned ? 'text-primary hover:bg-slate-50 dark:hover:bg-slate-800' : 'text-slate-300 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPinnedIds((prev) => toggleSetValue(prev, clip.id));
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-xl"
                              style={
                                pinned ? ({ fontVariationSettings: "'FILL' 1" } as CSSProperties) : undefined
                              }
                            >
                              push_pin
                            </span>
                          </button>

                          <button
                            type="button"
                            aria-label={`删除记录 ${clip.content}`}
                            className="p-2 rounded-full transition-colors text-slate-300 hover:text-rose-500 dark:hover:text-rose-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteClip(clip);
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">暂无历史条目。</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                显示最近同步的 50 条记录
              </p>
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-auto fixed z-[80] rounded-xl border border-indigo-200/80 dark:border-indigo-300/45 ring-1 ring-violet-200/70 dark:ring-indigo-400/45 bg-white/98 dark:bg-slate-950/96 backdrop-blur-lg shadow-[0_18px_40px_-22px_rgba(99,102,241,0.45)] p-3 overflow-y-auto custom-scrollbar"
          style={tooltip.style}
          data-tooltip-key={tooltip.key}
          onMouseEnter={clearTooltipHideTimer}
          onMouseLeave={scheduleTooltipHide}
        >
          <p className="mono-text text-xs leading-5 text-slate-700 dark:text-slate-100 whitespace-pre-wrap break-words">
            {tooltip.content}
          </p>
        </div>
      )}
    </div>
  );
}
