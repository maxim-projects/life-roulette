import type { ClassId, ItemId } from '../game/types';
import { STORAGE_KEYS } from './schema';

export interface PlayerProfile {
  id: string;
  name: string;
  currency: number;
  inventory: Record<ItemId, number>;
  ownedClasses: ClassId[];
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

    return parsed.map(
      (profile: PlayerProfile & { ownedClasses?: ClassId[]; inventory?: Partial<Record<ItemId, number>> }) => ({
        ...profile,
        // Migration: legacy profiles missed `knife` key in inventory.
        // Without this, Math.max(undefined, 0) = NaN later in initGame.
        inventory: {
          chocolate: profile.inventory?.chocolate ?? 0,
          magnifier: profile.inventory?.magnifier ?? 0,
          knife: profile.inventory?.knife ?? 0,
        },
        ownedClasses: profile.ownedClasses ?? [],
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
    inventory: { chocolate: 0, magnifier: 0, knife: 0 },
    ownedClasses: [],
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
