import type { ItemId } from '../game/types';
import { STORAGE_KEYS } from './schema';

export interface PlayerProfile {
  id: string;
  name: string;
  currency: number;
  inventory: Record<ItemId, number>;
  createdAt: number;
  lastUsed: number;
}

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

    return parsed as PlayerProfile[];
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
    inventory: { chocolate: 0, magnifier: 0 },
    createdAt: now,
    lastUsed: now,
  };

  const profiles = readAll();
  profiles.push(profile);
  writeAll(profiles);

  return profile;
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
