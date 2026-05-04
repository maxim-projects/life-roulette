import { describe, expect, it } from 'vitest';
import { botDecide } from '../../src/game/bot';
import { createRng } from '../../src/game/rng';
import type { Player, PlayerView } from '../../src/game/types';

function makeView(options: {
  selfInventory?: Player['inventory'];
  selfLives?: number;
  otherPlayers?: PlayerView['otherPlayers'];
  chamberLive?: number;
  chamberBlank?: number;
}): PlayerView {
  const self: Player = {
    id: 'bot',
    name: 'Bot',
    profileId: null,
    lives: options.selfLives ?? 4,
    inventory: options.selfInventory ?? { chocolate: 1, magnifier: 1 },
    isBot: true,
    eliminated: false,
  };

  return {
    selfPlayer: self,
    otherPlayers: options.otherPlayers ?? [
      { id: 'human', name: 'Human', lives: 3, eliminated: false },
    ],
    chamberLive: options.chamberLive ?? 3,
    chamberBlank: options.chamberBlank ?? 3,
    currentPlayerId: 'bot',
    phase: 'turn-item',
  };
}

describe('botDecide', () => {
  it('uses magnifier first when available', () => {
    expect(
      botDecide(makeView({}), createRng(1), {
        magnifierUsedThisTurn: false,
        peekedNextBullet: null,
      }),
    ).toEqual({ type: 'use-item', itemId: 'magnifier' });
  });

  it('peek blank without cap means shoot self', () => {
    expect(
      botDecide(makeView({}), createRng(1), {
        magnifierUsedThisTurn: true,
        peekedNextBullet: 'blank',
        extraTurnsUsedByMe: 0,
      }),
    ).toEqual({ type: 'shoot', targetId: 'bot' });
  });

  it('peek blank with cap reached means shoot weakest enemy', () => {
    const view = makeView({
      otherPlayers: [
        { id: 'h1', name: 'A', lives: 4, eliminated: false },
        { id: 'h2', name: 'B', lives: 1, eliminated: false },
      ],
    });

    expect(
      botDecide(view, createRng(1), {
        magnifierUsedThisTurn: true,
        peekedNextBullet: 'blank',
        extraTurnsUsedByMe: 1,
      }),
    ).toEqual({ type: 'shoot', targetId: 'h2' });
  });

  it('peek live means shoot weakest enemy', () => {
    const view = makeView({
      otherPlayers: [
        { id: 'h1', name: 'A', lives: 3, eliminated: false },
        { id: 'h2', name: 'B', lives: 1, eliminated: false },
      ],
    });

    expect(
      botDecide(view, createRng(1), {
        magnifierUsedThisTurn: true,
        peekedNextBullet: 'live',
        extraTurnsUsedByMe: 0,
      }),
    ).toEqual({ type: 'shoot', targetId: 'h2' });
  });

  it('low life with chocolate means heal first', () => {
    expect(
      botDecide(
        makeView({
          selfLives: 1,
          selfInventory: { chocolate: 1, magnifier: 0 },
        }),
        createRng(1),
        {
          magnifierUsedThisTurn: true,
          peekedNextBullet: null,
          chocolateUsedThisTurn: false,
        },
      ),
    ).toEqual({ type: 'use-item', itemId: 'chocolate' });
  });

  it('unknown bullet with more live rounds means shoot weakest enemy', () => {
    const view = makeView({
      chamberLive: 4,
      chamberBlank: 2,
      otherPlayers: [{ id: 'h', name: 'H', lives: 2, eliminated: false }],
    });

    expect(
      botDecide(view, createRng(1), {
        magnifierUsedThisTurn: true,
        peekedNextBullet: null,
      }),
    ).toEqual({ type: 'shoot', targetId: 'h' });
  });

  it('unknown bullet with more blanks means shoot self', () => {
    expect(
      botDecide(
        makeView({
          chamberLive: 1,
          chamberBlank: 4,
        }),
        createRng(1),
        {
          magnifierUsedThisTurn: true,
          peekedNextBullet: null,
          extraTurnsUsedByMe: 0,
        },
      ),
    ).toEqual({ type: 'shoot', targetId: 'bot' });
  });
});
