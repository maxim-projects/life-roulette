import type { Rng } from './rng';
import type { Bullet, Chamber } from './types';

export function generateChamber(rng: Rng): Chamber {
  const liveCount = rng.intRange(1, 5);
  const blankCount = 6 - liveCount;
  const bullets: Bullet[] = [
    ...Array(liveCount).fill('live'),
    ...Array(blankCount).fill('blank'),
  ];

  rng.shuffle(bullets);

  return {
    bullets,
    liveCount,
    blankCount,
  };
}

export function fireBullet(chamber: Chamber): { bullet: Bullet; chamber: Chamber } {
  if (chamber.bullets.length === 0) {
    throw new Error('Cannot fire from empty chamber');
  }

  const bullet = chamber.bullets[0]!;

  return {
    bullet,
    chamber: {
      bullets: chamber.bullets.slice(1),
      liveCount: chamber.liveCount - (bullet === 'live' ? 1 : 0),
      blankCount: chamber.blankCount - (bullet === 'blank' ? 1 : 0),
    },
  };
}
