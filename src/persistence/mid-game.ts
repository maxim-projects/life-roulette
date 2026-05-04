import type { GameState } from '../game/types';
import { STORAGE_KEYS } from './schema';

export function saveMidGame(state: GameState): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.midGame, JSON.stringify(state));
  } catch {
    // Ignore quota and storage access failures in MVP.
  }
}

export function loadMidGame(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.midGame);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearMidGame(): void {
  sessionStorage.removeItem(STORAGE_KEYS.midGame);
}
