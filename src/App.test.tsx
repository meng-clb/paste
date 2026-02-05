import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders Sync and View more actions', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view more/i })).toBeInTheDocument();
  });
});
