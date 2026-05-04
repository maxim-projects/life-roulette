import { describe, expect, it } from 'vitest';
import { defaultClassState, initialPlayerForClass } from '../../src/game/classes';
import { resolveDamage } from '../../src/game/damage';
import type { Player } from '../../src/game/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'P1',
    profileId: null,
    lives: 4,
    inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    isBot: false,
    eliminated: false,
    classId: null,
    classState: defaultClassState(),
    ...overrides,
  };
}

describe('resolveDamage', () => {
  it('classless player: damage passes through unchanged', () => {
    const target = makePlayer();
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(1);
    expect(result.updatedClassState).toEqual(target.classState);
    expect(result.events).toEqual([]);
  });

  it('blank/zero damage stays zero (no class trigger)', () => {
    const target = makePlayer({ classId: 'tank' });
    const result = resolveDamage(target, 0, 'bullet');

    expect(result.finalDamage).toBe(0);
    expect(result.updatedClassState.tankBlockUsed).toBe(false);
    expect(result.events).toEqual([]);
  });

  it('tank blocks first incoming bullet (live), sets tankBlockUsed', () => {
    const target = makePlayer({ classId: 'tank' });
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(0);
    expect(result.updatedClassState.tankBlockUsed).toBe(true);
    expect(result.events).toEqual([{ type: 'tank-block-triggered', playerId: 'p1' }]);
  });

  it('tank does NOT block second bullet (already used)', () => {
    const target = makePlayer({
      classId: 'tank',
      classState: { ...defaultClassState(), tankBlockUsed: true },
    });
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(1);
    expect(result.updatedClassState.tankBlockUsed).toBe(true);
    expect(result.events).toEqual([]);
  });

  it('tank does NOT block lightning (only bullets)', () => {
    const target = makePlayer({ classId: 'tank' });
    const result = resolveDamage(target, 1, 'lightning');

    expect(result.finalDamage).toBe(1);
    expect(result.updatedClassState.tankBlockUsed).toBe(false);
  });

  it('specops armor halves bullet damage and consumes 1 charge', () => {
    const target = makePlayer({
      classId: 'specops',
      classState: initialPlayerForClass('specops'),
    });
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(0.5);
    expect(result.updatedClassState.armorChargesLeft).toBe(2);
    expect(result.updatedClassState.armorActive).toBe(true);
  });

  it('specops armor halves lightning damage too', () => {
    const target = makePlayer({
      classId: 'specops',
      classState: initialPlayerForClass('specops'),
    });
    const result = resolveDamage(target, 1, 'lightning');

    expect(result.finalDamage).toBe(0.5);
    expect(result.updatedClassState.armorChargesLeft).toBe(2);
  });

  it('specops armor breaks at 0 charges, emits armor-broke', () => {
    const target = makePlayer({
      classId: 'specops',
      classState: { ...initialPlayerForClass('specops'), armorChargesLeft: 1 },
    });
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(0.5);
    expect(result.updatedClassState.armorActive).toBe(false);
    expect(result.updatedClassState.armorChargesLeft).toBe(0);
    expect(result.events).toEqual([{ type: 'armor-broke', playerId: 'p1' }]);
  });

  it('specops without armor (broken) takes full damage', () => {
    const target = makePlayer({
      classId: 'specops',
      classState: { ...initialPlayerForClass('specops'), armorActive: false },
    });
    const result = resolveDamage(target, 1, 'bullet');

    expect(result.finalDamage).toBe(1);
  });
});
