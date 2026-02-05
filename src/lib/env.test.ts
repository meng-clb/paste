import { describe, it, expect } from 'vitest';
import { readFirebaseEnv } from './env';

describe('readFirebaseEnv', () => {
  it('throws when required keys are missing', () => {
    expect(() => readFirebaseEnv({})).toThrow('VITE_FIREBASE_API_KEY');
  });

  it('returns config when all keys exist', () => {
    const env = {
      VITE_FIREBASE_API_KEY: 'k',
      VITE_FIREBASE_AUTH_DOMAIN: 'd',
      VITE_FIREBASE_PROJECT_ID: 'p',
      VITE_FIREBASE_APP_ID: 'a',
    };
    expect(readFirebaseEnv(env)).toEqual({
      apiKey: 'k',
      authDomain: 'd',
      projectId: 'p',
      appId: 'a',
    });
  });
});
