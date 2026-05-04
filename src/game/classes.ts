import type { ClassId, ClassState, ItemId } from './types';

export function defaultClassState(): ClassState {
  return {
    tankBlockUsed: false,
    armorActive: false,
    armorChargesLeft: 0,
    armorRoundsLeft: 0,
    knifeArmed: false,
    knifeUsed: false,
    lightningUsedThisChamber: false,
    lightningTotalUsed: 0,
  };
}

export function initialPlayerForClass(classId: ClassId | null): ClassState {
  const base = defaultClassState();

  if (classId === 'specops') {
    return {
      ...base,
      armorActive: true,
      armorChargesLeft: 3,
      armorRoundsLeft: 3,
    };
  }

  return base;
}

export function classMaxLives(classId: ClassId | null): number {
  if (classId === 'double') {
    return 5;
  }

  return 4;
}

export function classStartingLives(classId: ClassId | null): number {
  if (classId === 'double') {
    return 5;
  }

  return 4;
}

export function classStartingInventory(classId: ClassId | null): Record<ItemId, number> {
  const base: Record<ItemId, number> = {
    chocolate: 1,
    magnifier: 1,
    knife: 0,
  };

  if (classId === 'double') {
    return {
      ...base,
      knife: 1,
    };
  }

  return base;
}

export const CLASS_PRICES: Record<ClassId, number> = {
  medic: 200,
  tank: 300,
  specops: 400,
  double: 5000,
  god: 10000,
};

export const ALL_CLASS_IDS: ClassId[] = ['medic', 'tank', 'specops', 'double', 'god'];
