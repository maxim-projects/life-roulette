import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearMidGame,
  loadMidGame,
  saveMidGame,
} from '../../../src/persistence/mid-game';
import type { GameState } from '../../../src/game/types';

const memorySession = (() => {
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
  memorySession.clear();
  (
    globalThis as unknown as {
      sessionStorage: typeof memorySession;
    }
  ).sessionStorage = memorySession;
});

const dummyState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  chamber: { bullets: [], liveCount: 0, blankCount: 0 },
  phase: 'turn-item',
  rngSeed: 1,
  rngState: 1,
  extraTurnsUsedThisChamber: {},
  itemsUsedThisTurn: { chocolate: false, magnifier: false, knife: false, super: false },
  winnerId: null,
  actionLog: [],
};

describe('mid-game persistence', () => {
  it('save and load round-trip state', () => {
    saveMidGame(dummyState);

    expect(loadMidGame()).toEqual(dummyState);
  });

  it('clear removes saved state', () => {
    saveMidGame(dummyState);
    clearMidGame();

    expect(loadMidGame()).toBeNull();
  });

  it('returns null on garbage payload', () => {
    memorySession.setItem('life-roulette:mid-game', 'broken');

    expect(loadMidGame()).toBeNull();
  });
});
