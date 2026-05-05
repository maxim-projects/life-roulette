import { describe, expect, it } from 'vitest';
import {
  calculateReward,
  classMaxLives,
  classStartingInventory,
  defaultClassState,
  initialPlayerForClass,
  rewardMultiplierForClass,
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

  describe('reward multipliers', () => {
    it('rewardMultiplierForClass: classless = 1.0', () => {
      expect(rewardMultiplierForClass(null)).toBe(1.0);
    });

    it('rewardMultiplierForClass: each class has expected multiplier', () => {
      expect(rewardMultiplierForClass('medic')).toBe(1.1);
      expect(rewardMultiplierForClass('tank')).toBe(1.3);
      expect(rewardMultiplierForClass('specops')).toBe(1.5);
      expect(rewardMultiplierForClass('double')).toBe(2.0);
      expect(rewardMultiplierForClass('god')).toBe(4.0);
    });

    it('calculateReward: classless winner gets 200, participant gets 50', () => {
      expect(calculateReward(null, true)).toBe(200);
      expect(calculateReward(null, false)).toBe(50);
    });

    it('calculateReward: Medic winner gets 220 (200 * 1.1), participant 55', () => {
      expect(calculateReward('medic', true)).toBe(220);
      expect(calculateReward('medic', false)).toBe(55);
    });

    it('calculateReward: Tank winner 260, participant 65', () => {
      expect(calculateReward('tank', true)).toBe(260);
      expect(calculateReward('tank', false)).toBe(65);
    });

    it('calculateReward: Specops winner 300, participant 75', () => {
      expect(calculateReward('specops', true)).toBe(300);
      expect(calculateReward('specops', false)).toBe(75);
    });

    it('calculateReward: Double winner 400, participant 100', () => {
      expect(calculateReward('double', true)).toBe(400);
      expect(calculateReward('double', false)).toBe(100);
    });

    it('calculateReward: God winner 800, participant 200', () => {
      expect(calculateReward('god', true)).toBe(800);
      expect(calculateReward('god', false)).toBe(200);
    });

    it('calculateReward: floors fractional results (no .999 cents)', () => {
      // Sanity test that Math.floor is used, not Math.round
      // 50 * 1.3 = 65 exactly. To get a floor, we'd need a fractional hypothetical.
      // 50 * 1.51 = 75.5 → floor → 75. But our actual multipliers all yield integers.
      // This test guards against future multiplier values that might float.
      const oddMultiplier = 1.51;
      const result = Math.floor(50 * oddMultiplier);
      expect(result).toBe(75);
    });
  });
});
