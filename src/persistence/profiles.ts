import type { ClassId, ItemId } from '../game/types';
import { STORAGE_KEYS } from './schema';

export interface PlayerProfile {
  id: string;
  name: string;
  currency: number;
  tokens: number;
  inventory: Record<ItemId, number>;
  ownedClasses: ClassId[];
  createdAt: number;
  lastUsed: number;
}

export const TOKEN_EXCHANGE_RATE = 1000; // 1 токен = 1000 валюты

function readAll(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profiles);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      (profile: Partial<PlayerProfile> & {
        ownedClasses?: ClassId[];
        inventory?: Partial<Record<ItemId, number>>;
        tokens?: number;
      }) => ({
        ...(profile as PlayerProfile),
        // Migration: legacy profiles missed `knife` key in inventory.
        // Without this, Math.max(undefined, 0) = NaN later in initGame.
        inventory: {
          chocolate: profile.inventory?.chocolate ?? 0,
          magnifier: profile.inventory?.magnifier ?? 0,
          knife: profile.inventory?.knife ?? 0,
          super: profile.inventory?.super ?? 0,
        },
        ownedClasses: profile.ownedClasses ?? [],
        tokens: profile.tokens ?? 0,
      }),
    );
  } catch {
    return [];
  }
}

function writeAll(profiles: PlayerProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listProfiles(): PlayerProfile[] {
  return readAll();
}

export function getProfile(id: string): PlayerProfile | null {
  return readAll().find((profile) => profile.id === id) ?? null;
}

export function createProfile(name: string): PlayerProfile {
  const now = Date.now();
  const profile: PlayerProfile = {
    id: generateId(),
    name,
    currency: 0,
    tokens: 0,
    inventory: { chocolate: 0, magnifier: 0, knife: 0, super: 0 },
    ownedClasses: [],
    createdAt: now,
    lastUsed: now,
  };

  const profiles = readAll();
  profiles.push(profile);
  writeAll(profiles);

  return profile;
}

/**
 * Обмен валюты на токены.
 * Возвращает обновлённый профиль или null если недостаточно валюты.
 */
export function exchangeCurrencyToTokens(profileId: string, tokenAmount: number): PlayerProfile | null {
  const profile = getProfile(profileId);
  if (!profile) return null;
  if (tokenAmount <= 0) return null;

  const cost = tokenAmount * TOKEN_EXCHANGE_RATE;
  if (profile.currency < cost) return null;

  updateProfile(profileId, {
    currency: profile.currency - cost,
    tokens: profile.tokens + tokenAmount,
  });
  return getProfile(profileId);
}

/**
 * Обмен токенов на валюту.
 * Возвращает обновлённый профиль или null если недостаточно токенов.
 */
export function exchangeTokensToCurrency(profileId: string, tokenAmount: number): PlayerProfile | null {
  const profile = getProfile(profileId);
  if (!profile) return null;
  if (tokenAmount <= 0) return null;
  if (profile.tokens < tokenAmount) return null;

  updateProfile(profileId, {
    tokens: profile.tokens - tokenAmount,
    currency: profile.currency + tokenAmount * TOKEN_EXCHANGE_RATE,
  });
  return getProfile(profileId);
}

export function updateProfile(
  id: string,
  patch: Partial<Omit<PlayerProfile, 'id' | 'createdAt'>>,
): void {
  const profiles = readAll();
  const index = profiles.findIndex((profile) => profile.id === id);

  if (index < 0) {
    throw new Error(`Profile ${id} not found`);
  }

  profiles[index] = {
    ...profiles[index]!,
    ...patch,
    lastUsed: Date.now(),
  };

  writeAll(profiles);
}

export function deleteProfile(id: string): void {
  writeAll(readAll().filter((profile) => profile.id !== id));
}
