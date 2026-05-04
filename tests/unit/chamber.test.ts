import { describe, expect, it } from 'vitest';
import { generateChamber, fireBullet } from '../../src/game/chamber';
import { createRng } from '../../src/game/rng';
import type { Chamber } from '../../src/game/types';

describe('chamber', () => {
  describe('generateChamber', () => {
    it('always creates six bullets', () => {
      for (let seed = 1; seed < 50; seed += 1) {
        expect(generateChamber(createRng(seed)).bullets).toHaveLength(6);
      }
    });

    it('always includes at least one live and one blank bullet', () => {
      for (let seed = 1; seed < 50; seed += 1) {
        const chamber = generateChamber(createRng(seed));
        expect(chamber.liveCount).toBeGreaterThanOrEqual(1);
        expect(chamber.blankCount).toBeGreaterThanOrEqual(1);
        expect(chamber.liveCount + chamber.blankCount).toBe(6);
      }
    });

    it('keeps counts in sync with bullets array', () => {
      const chamber = generateChamber(createRng(123));
      expect(chamber.liveCount).toBe(
        chamber.bullets.filter((bullet) => bullet === 'live').length,
      );
      expect(chamber.blankCount).toBe(
        chamber.bullets.filter((bullet) => bullet === 'blank').length,
      );
    });

    it('is deterministic for same seed', () => {
      expect(generateChamber(createRng(42))).toEqual(
        generateChamber(createRng(42)),
      );
    });
  });

  describe('fireBullet', () => {
    it('removes front bullet and returns it', () => {
      const chamber = generateChamber(createRng(7));
      const expectedFront = chamber.bullets[0];
      const result = fireBullet(chamber);

      expect(result.bullet).toBe(expectedFront);
      expect(result.chamber.bullets).toHaveLength(5);
    });

    it('updates counts after live bullet', () => {
      const chamber: Chamber = {
        bullets: ['live', 'blank'],
        liveCount: 1,
        blankCount: 1,
      };
      const result = fireBullet(chamber);

      expect(result.bullet).toBe('live');
      expect(result.chamber.liveCount).toBe(0);
      expect(result.chamber.blankCount).toBe(1);
    });

    it('updates counts after blank bullet', () => {
      const chamber: Chamber = {
        bullets: ['blank', 'live'],
        liveCount: 1,
        blankCount: 1,
      };
      const result = fireBullet(chamber);

      expect(result.bullet).toBe('blank');
      expect(result.chamber.liveCount).toBe(1);
      expect(result.chamber.blankCount).toBe(0);
    });

    it('throws on empty chamber', () => {
      expect(() =>
        fireBullet({ bullets: [], liveCount: 0, blankCount: 0 }),
      ).toThrow();
    });
  });
});
