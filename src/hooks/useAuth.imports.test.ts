import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAuth.ts'), 'utf8');

describe('useAuth imports', () => {
  it('uses type-only import for User', () => {
    expect(source).toContain("import type { User } from 'firebase/auth';");
  });
});
