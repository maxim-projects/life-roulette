import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassId } from '../../../src/game/types';
import {
  createProfile,
  deleteProfile,
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
    expect(profile.inventory).toEqual({ chocolate: 0, magnifier: 0, knife: 0 });
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
      inventory: { chocolate: 2, magnifier: 1, knife: 0 },
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
});
