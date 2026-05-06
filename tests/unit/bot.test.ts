import { describe, expect, it } from 'vitest';
import { defaultClassState } from '../../src/game/classes';
import { botDecide } from '../../src/game/bot';
import { createRng } from '../../src/game/rng';
import type { Player, PlayerView } from '../../src/game/types';

function makeView(options: {
  selfInventory?: Player['inventory'];
  selfLives?: number;
  selfClassId?: Player['classId'];
  selfClassState?: Player['classState'];
  otherPlayers?: PlayerView['otherPlayers'];
  chamberLive?: number;
  chamberBlank?: number;
}): PlayerView {
  const self: Player = {
    id: 'bot',
    name: 'Bot',
    profileId: null,
    lives: options.selfLives ?? 4,
    inventory: options.selfInventory ?? { chocolate: 1, magnifier: 1, knife: 0, super: 0 },
    isBot: true,
    eliminated: false,
    classId: options.selfClassId ?? null,
    classState: options.selfClassState ?? defaultClassState(),
  };

  return {
    selfPlayer: self,
    otherPlayers: options.otherPlayers ?? [
      { id: 'human', name: 'Human', lives: 3, eliminated: false, classId: null },
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
        { id: 'h1', name: 'A', lives: 4, eliminated: false, classId: null },
        { id: 'h2', name: 'B', lives: 1, eliminated: false, classId: null },
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
        { id: 'h1', name: 'A', lives: 3, eliminated: false, classId: null },
        { id: 'h2', name: 'B', lives: 1, eliminated: false, classId: null },
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
          selfInventory: { chocolate: 1, magnifier: 0, knife: 0, super: 0 },
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
      otherPlayers: [{ id: 'h', name: 'H', lives: 2, eliminated: false, classId: null }],
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

describe('botDecide for God class', () => {
  it('God with lightning available + weak enemy → cast lightning', () => {
    const view = makeView({
      selfClassId: 'god',
      selfClassState: { ...defaultClassState() },
      otherPlayers: [{ id: 'h', name: 'H', lives: 1, eliminated: false, classId: null }],
    });

    const action = botDecide(view, createRng(1), {
      magnifierUsedThisTurn: false,
      peekedNextBullet: null,
    });

    expect(action).toEqual({ type: 'use-ability', ability: 'lightning', targetId: 'h' });
  });

  it('God without lightning charges → falls through to magnifier', () => {
    const view = makeView({
      selfClassId: 'god',
      selfClassState: { ...defaultClassState(), lightningTotalUsed: 4 },
      otherPlayers: [{ id: 'h', name: 'H', lives: 1, eliminated: false, classId: null }],
    });

    const action = botDecide(view, createRng(1), {
      magnifierUsedThisTurn: false,
      peekedNextBullet: null,
    });

    expect(action).toEqual({ type: 'use-item', itemId: 'magnifier' });
  });
});

describe('botDecide for Double class', () => {
  it('Double sees peeked=live + has knife + weak enemy → arm knife', () => {
    const view = makeView({
      selfLives: 5,
      selfInventory: { chocolate: 1, magnifier: 1, knife: 1, super: 0 },
      selfClassId: 'double',
      selfClassState: { ...defaultClassState() },
      otherPlayers: [{ id: 'h', name: 'H', lives: 2, eliminated: false, classId: null }],
    });

    const action = botDecide(view, createRng(1), {
      magnifierUsedThisTurn: true,
      peekedNextBullet: 'live',
    });

    expect(action).toEqual({ type: 'use-item', itemId: 'knife' });
  });

  it('Double without knife in inventory falls through', () => {
    const view = makeView({
      selfLives: 5,
      selfInventory: { chocolate: 1, magnifier: 1, knife: 0, super: 0 },
      selfClassId: 'double',
      selfClassState: { ...defaultClassState(), knifeUsed: true },
      otherPlayers: [{ id: 'h', name: 'H', lives: 2, eliminated: false, classId: null }],
    });

    const action = botDecide(view, createRng(1), {
      magnifierUsedThisTurn: true,
      peekedNextBullet: 'live',
    });

    expect(action).toEqual({ type: 'shoot', targetId: 'h' });
  });
});
