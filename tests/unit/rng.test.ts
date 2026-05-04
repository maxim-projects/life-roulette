import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/game/rng';

describe('rng', () => {
  it('produces deterministic sequence from same seed', () => {
    const r1 = createRng(42);
    const r2 = createRng(42);

    expect([r1.next(), r1.next(), r1.next()]).toEqual([
      r2.next(),
      r2.next(),
      r2.next(),
    ]);
  });

  it('different seeds produce different sequences', () => {
    expect(createRng(42).next()).not.toEqual(createRng(43).next());
  });

  it('next returns float in [0, 1)', () => {
    const rng = createRng(1);

    for (let index = 0; index < 100; index += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('intRange returns integer in inclusive bounds', () => {
    const rng = createRng(7);

    for (let index = 0; index < 100; index += 1) {
      const value = rng.intRange(1, 5);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('shuffle preserves elements', () => {
    const rng = createRng(99);
    const original = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle([...original]);

    expect([...shuffled].sort()).toEqual(original);
  });

  it('serializes and restores internal state', () => {
    const r1 = createRng(42);
    r1.next();
    r1.next();

    const state = r1.toState();
    const r2 = createRng(0);
    r2.fromState(state);

    expect(r1.next()).toEqual(r2.next());
  });
});
