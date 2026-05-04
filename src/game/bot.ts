import type { Rng } from './rng';
import type { Action, Bullet, PlayerView } from './types';

export interface BotContext {
  magnifierUsedThisTurn: boolean;
  chocolateUsedThisTurn?: boolean;
  peekedNextBullet: Bullet | null;
  extraTurnsUsedByMe?: number;
}

export function botDecide(view: PlayerView, _rng: Rng, context: BotContext): Action {
  const me = view.selfPlayer;
  const aliveEnemies = view.otherPlayers.filter((player) => !player.eliminated);
  const weakestEnemy = aliveEnemies.reduce<typeof aliveEnemies[number] | null>(
    (currentWeakest, player) =>
      !currentWeakest || player.lives < currentWeakest.lives
        ? player
        : currentWeakest,
    null,
  );

  if (
    me.lives <= 1 &&
    me.inventory.chocolate > 0 &&
    !context.chocolateUsedThisTurn
  ) {
    return { type: 'use-item', itemId: 'chocolate' };
  }

  if (me.inventory.magnifier > 0 && !context.magnifierUsedThisTurn) {
    return { type: 'use-item', itemId: 'magnifier' };
  }

  if (context.peekedNextBullet === 'blank') {
    const capReached = (context.extraTurnsUsedByMe ?? 0) >= 1;

    if (!capReached) {
      return { type: 'shoot', targetId: me.id };
    }

    if (weakestEnemy) {
      return { type: 'shoot', targetId: weakestEnemy.id };
    }
  }

  if (context.peekedNextBullet === 'live') {
    if (weakestEnemy) {
      return { type: 'shoot', targetId: weakestEnemy.id };
    }

    return { type: 'shoot', targetId: me.id };
  }

  if (view.chamberLive >= view.chamberBlank && weakestEnemy) {
    return { type: 'shoot', targetId: weakestEnemy.id };
  }

  return { type: 'shoot', targetId: me.id };
}
