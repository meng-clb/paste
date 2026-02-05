import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

const mockHistory = [
  {
    id: 'clip-1',
    content: 'hello world',
    hash: 'hash',
    deviceLabel: 'web',
    createdAt: null,
  },
];

vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({ loading: false, user: { uid: 'user-1' } }) }));
vi.mock('./hooks/useClips', () => ({
  useClips: () => ({
    latest: null,
    history: mockHistory,
    startHistory: () => {},
    stopHistory: () => {},
    syncClip: async () => ({ ok: true }),
  }),
}));
vi.mock('./components/AuthPanel', () => ({ default: () => null }));

describe('App', () => {
  it('renders Sync and View more actions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view more/i })).toBeInTheDocument();
  });

  it('copies history clip to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<App />);
    screen.getAllByRole('button', { name: /view more/i })[0].click();
    const copyButtons = await screen.findAllByRole('button', { name: /copy/i });
    copyButtons[0].click();
    expect(writeText).toHaveBeenCalledWith('hello world');
  });
});
