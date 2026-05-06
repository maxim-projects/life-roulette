import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassId } from '../../../src/game/types';
import {
  createProfile,
  deleteProfile,
  exchangeCurrencyToTokens,
  exchangeTokensToCurrency,
  getProfile,
  listProfiles,
  updateProfile,
} from '../../../src/persistence/profiles';

const memoryStorage = (() => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
})();

beforeEach(() => {
  memoryStorage.clear();
  (
    globalThis as unknown as {
      localStorage: typeof memoryStorage;
    }
  ).localStorage = memoryStorage;
});

describe('profiles', () => {
  it('is initially empty', () => {
    expect(listProfiles()).toEqual([]);
  });

  it('create adds profile with defaults', () => {
    const profile = createProfile('Alice');

    expect(profile.name).toBe('Alice');
    expect(profile.currency).toBe(0);
    expect(profile.inventory).toEqual({ chocolate: 0, magnifier: 0, knife: 0, super: 0 });
  });

  it('list returns saved profiles', () => {
    createProfile('A');
    createProfile('B');

    expect(listProfiles().map((profile) => profile.name).sort()).toEqual(['A', 'B']);
  });

  it('update modifies fields', () => {
    const profile = createProfile('Alice');

    updateProfile(profile.id, {
      currency: 100,
      inventory: { chocolate: 2, magnifier: 1, knife: 0, super: 0 },
    });

    const reloaded = getProfile(profile.id);

    expect(reloaded?.currency).toBe(100);
    expect(reloaded?.inventory.chocolate).toBe(2);
  });

  it('delete removes profile', () => {
    const profile = createProfile('A');

    deleteProfile(profile.id);

    expect(getProfile(profile.id)).toBeNull();
  });

  it('survives JSON parse errors', () => {
    memoryStorage.setItem('life-roulette:profiles', 'broken');

    expect(listProfiles()).toEqual([]);
  });
});

describe('profiles ownedClasses', () => {
  it('newly created profile has empty ownedClasses', () => {
    const profile = createProfile('Alice');

    expect(profile.ownedClasses).toEqual([]);
  });

  it('updateProfile sets ownedClasses', () => {
    const profile = createProfile('Alice');

    updateProfile(profile.id, { ownedClasses: ['medic', 'tank'] as ClassId[] });

    expect(getProfile(profile.id)?.ownedClasses).toEqual(['medic', 'tank']);
  });

  it('migrates legacy profiles (no ownedClasses field) to []', () => {
    memoryStorage.setItem(
      'life-roulette:profiles',
      JSON.stringify([
        {
          id: 'legacy',
          name: 'L',
          currency: 100,
          inventory: { chocolate: 0, magnifier: 0 },
          createdAt: 1,
          lastUsed: 1,
        },
      ]),
    );

    const profiles = listProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]!.ownedClasses).toEqual([]);
  });

  it('migrates legacy profiles missing inventory.knife (filling with 0)', () => {
    memoryStorage.setItem(
      'life-roulette:profiles',
      JSON.stringify([
        {
          id: 'legacy',
          name: 'L',
          currency: 100,
          inventory: { chocolate: 2, magnifier: 1 },
          createdAt: 1,
          lastUsed: 1,
        },
      ]),
    );

    const profiles = listProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]!.inventory).toEqual({ chocolate: 2, magnifier: 1, knife: 0, super: 0 });
  });

  it('migrates legacy profiles missing tokens (filling with 0)', () => {
    memoryStorage.setItem(
      'life-roulette:profiles',
      JSON.stringify([
        {
          id: 'legacy',
          name: 'L',
          currency: 5000,
          inventory: { chocolate: 0, magnifier: 0, knife: 0 },
          ownedClasses: [],
          createdAt: 1,
          lastUsed: 1,
        },
      ]),
    );

    const profiles = listProfiles();
    expect(profiles[0]!.tokens).toBe(0);
  });

  it('newly created profile starts with 0 tokens', () => {
    const profile = createProfile('Tokenholder');
    expect(profile.tokens).toBe(0);
  });
});

describe('token exchange', () => {
  it('exchangeCurrencyToTokens: 3000 валюты → 3 токена', () => {
    const profile = createProfile('Trader');
    updateProfile(profile.id, { currency: 5000 });
    const updated = exchangeCurrencyToTokens(profile.id, 3);
    expect(updated?.currency).toBe(2000);
    expect(updated?.tokens).toBe(3);
  });

  it('exchangeCurrencyToTokens: returns null on insufficient currency', () => {
    const profile = createProfile('Poor');
    updateProfile(profile.id, { currency: 500 });
    const result = exchangeCurrencyToTokens(profile.id, 1);
    expect(result).toBeNull();
    expect(getProfile(profile.id)?.currency).toBe(500);
  });

  it('exchangeTokensToCurrency: 2 токена → 2000 валюты', () => {
    const profile = createProfile('Trader');
    updateProfile(profile.id, { currency: 0, tokens: 5 });
    const updated = exchangeTokensToCurrency(profile.id, 2);
    expect(updated?.currency).toBe(2000);
    expect(updated?.tokens).toBe(3);
  });

  it('exchangeTokensToCurrency: returns null on insufficient tokens', () => {
    const profile = createProfile('Poor');
    const result = exchangeTokensToCurrency(profile.id, 1);
    expect(result).toBeNull();
  });

  it('exchangeCurrencyToTokens: rejects non-positive amount', () => {
    const profile = createProfile('X');
    updateProfile(profile.id, { currency: 5000 });
    expect(exchangeCurrencyToTokens(profile.id, 0)).toBeNull();
    expect(exchangeCurrencyToTokens(profile.id, -1)).toBeNull();
  });
});
