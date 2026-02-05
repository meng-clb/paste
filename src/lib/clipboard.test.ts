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
