import { describe, expect, it } from 'vitest';
import {
  classMaxLives,
  classStartingInventory,
  defaultClassState,
  initialPlayerForClass,
} from '../../src/game/classes';
import type { ClassId } from '../../src/game/types';

describe('classes', () => {
  it('defaultClassState returns all-false/zero', () => {
    expect(defaultClassState()).toEqual({
      tankBlockUsed: false,
      armorActive: false,
      armorChargesLeft: 0,
      armorRoundsLeft: 0,
      knifeArmed: false,
      knifeUsed: false,
      lightningUsedThisChamber: false,
      lightningTotalUsed: 0,
    });
  });

  it('initialPlayerForClass(specops) activates armor with 3 charges and 3 rounds', () => {
    const state = initialPlayerForClass('specops');

    expect(state.armorActive).toBe(true);
    expect(state.armorChargesLeft).toBe(3);
    expect(state.armorRoundsLeft).toBe(3);
  });

  it('initialPlayerForClass(null) returns default state', () => {
    expect(initialPlayerForClass(null)).toEqual(defaultClassState());
  });

  it('classMaxLives: double=5, others=4', () => {
    expect(classMaxLives('double')).toBe(5);
    expect(classMaxLives('medic')).toBe(4);
    expect(classMaxLives('tank')).toBe(4);
    expect(classMaxLives('specops')).toBe(4);
    expect(classMaxLives('god')).toBe(4);
    expect(classMaxLives(null)).toBe(4);
  });

  it('classStartingInventory: double has 1 knife, others have 0', () => {
    expect(classStartingInventory('double')).toEqual({
      chocolate: 1,
      magnifier: 1,
      knife: 1,
    });
    expect(classStartingInventory('medic')).toEqual({
      chocolate: 1,
      magnifier: 1,
      knife: 0,
    });
    expect(classStartingInventory(null)).toEqual({
      chocolate: 1,
      magnifier: 1,
      knife: 0,
    });
  });

  it('all 5 classes are defined', () => {
    const classes: (ClassId | null)[] = ['medic', 'tank', 'specops', 'double', 'god', null];

    for (const classId of classes) {
      expect(initialPlayerForClass(classId)).toBeDefined();
      expect(classMaxLives(classId)).toBeGreaterThan(0);
      expect(classStartingInventory(classId)).toBeDefined();
    }
  });
});
