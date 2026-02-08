import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import type { Clip } from './types';

type MockAuthState = {
  loading: boolean;
  user: { uid: string; email: string } | null;
};

const mocks = vi.hoisted(() => {
  const history: Clip[] = [
    {
      id: 'clip-1',
      content: 'hello world',
      hash: 'hash',
      deviceLabel: 'web',
      createdAt: null,
    },
    {
      id: 'clip-2',
      content: 'second clip',
      hash: 'hash-2',
      deviceLabel: 'web',
      createdAt: null,
    },
    {
      id: 'clip-3',
      content: 'third clip',
      hash: 'hash-3',
      deviceLabel: 'web',
      createdAt: null,
    },
  ];
  const auth: MockAuthState = {
    loading: false,
    user: { uid: 'user-1', email: '123456@163.com' },
  };
  return {
    auth,
    devicePresence: {
      connectedDeviceCount: 1,
    },
    clips: {
      latest: null as Clip | null,
      history,
      startHistory: vi.fn(),
      stopHistory: vi.fn(),
      syncClip: vi.fn(async () => ({ ok: true })),
      clearHistory: vi.fn(async () => ({ ok: true })),
      deleteClip: vi.fn(async () => ({ ok: true })),
    },
  };
});

vi.mock('./hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('./hooks/useDevicePresence', () => ({
  useDevicePresence: () => mocks.devicePresence.connectedDeviceCount,
}));
vi.mock('./hooks/useClips', () => ({
  useClips: () => mocks.clips,
}));
vi.mock('./lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

function markRowContentAsOverflow(row: HTMLElement) {
  const content =
    row.querySelector<HTMLElement>('[data-tooltip-content="true"]') ?? row.querySelector<HTMLElement>('p');
  if (!content) throw new Error('row content element not found');

  Object.defineProperty(content, 'clientHeight', {
    configurable: true,
    get: () => 36,
  });
  Object.defineProperty(content, 'scrollHeight', {
    configurable: true,
    get: () => 88,
  });
  Object.defineProperty(content, 'clientWidth', {
    configurable: true,
    get: () => 240,
  });
  Object.defineProperty(content, 'scrollWidth', {
    configurable: true,
    get: () => 420,
  });
}

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.auth.loading = false;
    mocks.auth.user = { uid: 'user-1', email: '123456@163.com' };
    mocks.devicePresence.connectedDeviceCount = 1;
    mocks.clips.latest = null;
    mocks.clips.history.forEach((clip) => {
      delete (clip as Clip & { deviceId?: string }).deviceId;
    });
    mocks.clips.startHistory.mockClear();
    mocks.clips.stopHistory.mockClear();
    mocks.clips.syncClip.mockClear();
    mocks.clips.clearHistory.mockClear();
    mocks.clips.deleteClip.mockClear();
  });

  it('shows login page when user is signed out', () => {
    mocks.auth.user = null;

    render(<App />);

    expect(screen.getByText(/登录后即可同步剪贴板历史/)).toBeInTheDocument();
    expect(screen.queryByText(/粘贴并同步/)).not.toBeInTheDocument();
  });

  it('shows dashboard when user is signed in', () => {
    render(<App />);

    expect(screen.getByText('123456@163.com')).toBeInTheDocument();
    expect(screen.queryByText(/账户状态/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /同步/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /查看全部/ })).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText('second clip')).toBeInTheDocument();
    expect(screen.getByText('历史记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /打开剪贴内容 hello world/i })).toHaveClass(
      'syncclip-lift-row'
    );
  });

  it('toggles account menu by click for touch/mobile usage', () => {
    render(<App />);

    const accountMenuButton = screen.getByRole('button', { name: /账户菜单/i });
    const accountMenuPanel = screen.getByTestId('account-menu-panel');

    expect(accountMenuButton).toHaveAttribute('aria-expanded', 'false');
    expect(accountMenuPanel).toHaveAttribute('hidden');

    fireEvent.click(accountMenuButton);

    expect(accountMenuButton).toHaveAttribute('aria-expanded', 'true');
    expect(accountMenuPanel).not.toHaveAttribute('hidden');
  });

  it('shows connected devices from login presence tracker instead of clips history', () => {
    mocks.devicePresence.connectedDeviceCount = 2;

    render(<App />);

    expect(screen.getByTestId('connected-device-count')).toHaveTextContent('2');
  });

  it('shows latest only in recent list and keeps main history non-scrollable', () => {
    mocks.clips.latest = {
      id: 'clip-1',
      content: 'hello world',
      hash: 'hash',
      deviceLabel: 'web',
      createdAt: null,
    };

    render(<App />);

    expect(screen.getAllByRole('button', { name: /打开剪贴内容 hello world/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /打开剪贴内容 second clip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /打开剪贴内容 third clip/i })).toBeInTheDocument();
    expect(screen.queryByText('chevron_right')).not.toBeInTheDocument();

    const mainHistoryList = screen.getByTestId('main-history-list');
    expect(mainHistoryList).toHaveClass('overflow-hidden');
    expect(mainHistoryList).not.toHaveClass('overflow-y-auto');
  });

  it('uses fixed viewport layout on dashboard to avoid page scrolling', () => {
    render(<App />);

    const root = screen.getByTestId('dashboard-root');
    expect(root).toHaveClass('h-screen');
    expect(root).toHaveClass('overflow-hidden');
    expect(root).toHaveClass('bg-gradient-to-br');
    expect(screen.getByTestId('dashboard-bg-shape-1')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-bg-shape-2')).toBeInTheDocument();
  });

  it('shows date for stale latest record instead of only time-of-day', () => {
    const oldDate = new Date('2024-10-01T08:30:00.000Z');
    mocks.clips.latest = {
      id: 'latest-old',
      content: 'old latest clip',
      hash: 'old-hash',
      deviceLabel: 'web',
      createdAt: {
        toDate: () => oldDate,
      } as unknown as Clip['createdAt'],
    };

    render(<App />);

    const expectedDateText = oldDate.toLocaleDateString();
    expect(screen.getAllByText(expectedDateText).length).toBeGreaterThan(0);
  });

  it('renders only full history rows when panel height cannot fit the next row', async () => {
    render(<App />);

    const mainHistoryList = screen.getByTestId('main-history-list');
    Object.defineProperty(mainHistoryList, 'clientHeight', {
      configurable: true,
      get: () => 220,
    });

    within(mainHistoryList)
      .getAllByRole('button', { name: /打开剪贴内容/i })
      .forEach((row) => {
        Object.defineProperty(row, 'offsetHeight', {
          configurable: true,
          get: () => 92,
        });
      });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(within(mainHistoryList).getAllByRole('button', { name: /打开剪贴内容/i })).toHaveLength(2);
    });
    expect(
      within(mainHistoryList).queryByRole('button', { name: /打开剪贴内容 third clip/i })
    ).not.toBeInTheDocument();
  });

  it('opens all-history modal with search and clear controls', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<App />);

    screen.getAllByRole('button', { name: /查看全部/ })[0].click();

    const dialog = await screen.findByRole('dialog', { name: /全部历史/ });
    const modal = within(dialog);
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(modal.getByText('third clip')).toBeInTheDocument();
    expect(modal.getByPlaceholderText(/搜索历史记录/)).toBeInTheDocument();
    expect(modal.getByRole('button', { name: /清空全部/ })).toBeInTheDocument();
    expect(modal.getByLabelText(/关闭历史弹窗/)).toBeInTheDocument();
    expect(modal.getByTestId('history-modal-list')).toHaveClass('overflow-y-auto');
    expect(modal.getByTestId('history-modal-list')).toHaveClass('min-h-0');
    expect(modal.getByTestId('history-modal-list')).toHaveClass('overscroll-contain');

    fireEvent.change(modal.getByPlaceholderText(/搜索历史记录/), {
      target: { value: 'third' },
    });
    expect(modal.getByText('third clip')).toBeInTheDocument();
    expect(modal.queryByText('hello world')).not.toBeInTheDocument();

      const rowButton = await modal.findByRole('button', { name: /打开剪贴内容 third clip/i });
      expect(rowButton).toHaveClass('syncclip-lift-row');
      rowButton.click();
      expect(writeText).toHaveBeenCalledWith('third clip');
      expect(await modal.findByTestId('modal-copy-hint')).toBeInTheDocument();

    fireEvent.click(modal.getByRole('button', { name: /清空全部/ }));
    expect(mocks.clips.clearHistory).toHaveBeenCalledTimes(1);
    expect(modal.getByText(/暂无历史条目/)).toBeInTheDocument();

    fireEvent.click(modal.getByLabelText(/关闭历史弹窗/));
    expect(document.body.style.overflow).toBe('');
  });

  it('shows delete action in all-history modal and removes the selected row', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /查看全部/ }));

    const dialog = await screen.findByRole('dialog', { name: /全部历史/ });
    const modal = within(dialog);
    expect(modal.getByRole('button', { name: /删除记录 third clip/i })).toBeInTheDocument();

    fireEvent.click(modal.getByRole('button', { name: /删除记录 third clip/i }));
    expect(mocks.clips.deleteClip).toHaveBeenCalledWith('clip-3');
    expect(modal.queryByRole('button', { name: /打开剪贴内容 third clip/i })).not.toBeInTheDocument();
    expect(modal.queryByRole('button', { name: /删除记录 third clip/i })).not.toBeInTheDocument();
  });

  it('renders recent record as a history-style row and copies directly on click', async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
      mocks.clips.latest = {
        id: 'latest-clip',
        content: 'latest text',
        hash: 'latest-hash',
        deviceLabel: 'web',
        createdAt: null,
      };

      render(<App />);

      expect(screen.queryByText(/来源：/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /content_copy复制/i })).not.toBeInTheDocument();

      const recentRow = screen.getByRole('button', { name: /打开剪贴内容 latest text/i });
      expect(recentRow).toHaveClass('syncclip-lift-row');
      fireEvent.click(recentRow);

      expect(writeText).toHaveBeenCalledWith('latest text');
      expect(within(recentRow).getByTestId('recent-copy-hint')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByTestId('recent-copy-hint')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides modal copy success hint one second after copying', () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      render(<App />);

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /查看全部/ }));
      });

      const dialog = screen.getByRole('dialog', { name: /全部历史/ });
      const modalRow = within(dialog).getByRole('button', { name: /打开剪贴内容 third clip/i });
      act(() => {
        fireEvent.click(modalRow);
      });

      expect(screen.getByTestId('modal-copy-hint')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByTestId('modal-copy-hint')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows delayed tooltip for preview and modal history rows, then hides on mouse leave', () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      const previewRow = screen.getByRole('button', { name: /打开剪贴内容 hello world/i });
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1200,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: 900,
      });
      Object.defineProperty(previewRow, 'getBoundingClientRect', {
        configurable: true,
        value: () =>
          ({
            left: 100,
            top: 150,
            width: 320,
            height: 48,
            right: 420,
            bottom: 198,
            x: 100,
            y: 150,
            toJSON: () => ({}),
          }) as DOMRect,
      });
      act(() => {
        fireEvent.mouseEnter(previewRow);
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      markRowContentAsOverflow(previewRow);
      act(() => {
        fireEvent.mouseEnter(previewRow);
        vi.advanceTimersByTime(500);
      });

      const previewTooltip = screen.getByRole('tooltip');
      expect(previewTooltip).toBeInTheDocument();
      expect(previewTooltip).toHaveClass('fixed');
      expect(previewTooltip).toHaveClass('overflow-y-auto');
      expect(previewTooltip.style.width).toBe('420px');
      expect(previewTooltip.style.top).toBe('206px');
      expect(previewTooltip.style.transform).toBe('');

      act(() => {
        fireEvent.mouseLeave(previewRow);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /查看全部/ }));
      });

      const dialog = screen.getByRole('dialog', { name: /全部历史/ });
      const modalRow = within(dialog).getByRole('button', { name: /打开剪贴内容 third clip/i });
      act(() => {
        fireEvent.mouseEnter(modalRow);
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      markRowContentAsOverflow(modalRow);
      act(() => {
        fireEvent.mouseEnter(modalRow);
        vi.advanceTimersByTime(500);
      });

      const modalTooltip = screen.getByRole('tooltip');
      expect(modalTooltip).toBeInTheDocument();
      expect(modalTooltip).toHaveClass('fixed');

      act(() => {
        fireEvent.mouseLeave(modalRow);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps tooltip visible when cursor moves from row into tooltip, and hides after leaving tooltip', () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      const previewRow = screen.getByRole('button', { name: /打开剪贴内容 hello world/i });
      markRowContentAsOverflow(previewRow);
      act(() => {
        fireEvent.mouseEnter(previewRow);
        vi.advanceTimersByTime(500);
      });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass('pointer-events-auto');
      expect(tooltip).toHaveClass('bg-white/98');
      expect(tooltip).toHaveClass('dark:bg-slate-950/96');
      expect(tooltip).toHaveClass('ring-violet-200/70');

      act(() => {
        fireEvent.mouseLeave(previewRow);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      act(() => {
        fireEvent.mouseEnter(screen.getByRole('tooltip'));
        vi.advanceTimersByTime(250);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      act(() => {
        fireEvent.mouseLeave(screen.getByRole('tooltip'));
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(450);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
