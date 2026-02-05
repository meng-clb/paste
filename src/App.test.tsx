import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./hooks/useAuth', () => ({ useAuth: () => ({ loading: false, user: null }) }));
vi.mock('./components/AuthPanel', () => ({ default: () => null }));

describe('App', () => {
  it('renders Sync and View more actions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view more/i })).toBeInTheDocument();
  });
});
