import { describe, it, expect } from 'vitest';

describe('useAuth module', () => {
  it('loads without runtime export errors', async () => {
    await expect(import('./useAuth')).resolves.toBeDefined();
  });
});
