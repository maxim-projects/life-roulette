import { describe, expect, it } from 'vitest';
import { applyAction, initGame } from '../../src/game/engine';
import type { Player } from '../../src/game/types';

function makePlayer(id: string, name: string, isBot = false): Player {
  return {
    id,
    name,
    profileId: null,
    lives: 4,
    inventory: { chocolate: 1, magnifier: 1 },
    isBot,
    eliminated: false,
  };
}

describe('engine.initGame', () => {
  it('creates valid state with 4 lives each and roulette phase', () => {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'B')];
    const state = initGame(players, 42);

    expect(state.players).toHaveLength(2);
    expect(state.players.every((player) => player.lives === 4)).toBe(true);
    expect(state.phase).toBe('roulette');
    expect(state.actionLog).toHaveLength(0);
    expect(state.chamber.bullets).toHaveLength(0);
  });

  it('throws on invalid player count', () => {
    expect(() => initGame([makePlayer('a', 'A')], 1)).toThrow();

    const eightPlayers = Array.from({ length: 8 }, (_, index) =>
      makePlayer(`p${index}`, `P${index}`),
    );

    expect(() => initGame(eightPlayers, 1)).toThrow();
  });
});

describe('engine.applyAction(spin-roulette)', () => {
  it('is deterministic from seed', () => {
    const players = [
      makePlayer('a', 'A'),
      makePlayer('b', 'B'),
      makePlayer('c', 'C'),
    ];
    const first = applyAction(initGame(players, 42), { type: 'spin-roulette' });
    const second = applyAction(initGame(players, 42), { type: 'spin-roulette' });

    expect(first.state.players[first.state.currentPlayerIndex]?.id).toEqual(
      second.state.players[second.state.currentPlayerIndex]?.id,
    );
  });

  it('emits roulette-spun event', () => {
    const result = applyAction(initGame([makePlayer('a', 'A'), makePlayer('b', 'B')], 42), {
      type: 'spin-roulette',
    });

    expect(result.events.find((event) => event.type === 'roulette-spun')).toBeDefined();
  });

  it('moves phase to loading', () => {
    const result = applyAction(initGame([makePlayer('a', 'A'), makePlayer('b', 'B')], 42), {
      type: 'spin-roulette',
    });

    expect(result.state.phase).toBe('loading');
  });

  it('skips eliminated players', () => {
    const players = [
      makePlayer('a', 'A'),
      makePlayer('b', 'B'),
      makePlayer('c', 'C'),
    ];
    let state = initGame(players, 42);
    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === 'a'
          ? { ...player, eliminated: true, lives: 0 }
          : player,
      ),
    };

    const result = applyAction(state, { type: 'spin-roulette' });

    expect(result.state.players[result.state.currentPlayerIndex]?.id).not.toBe('a');
  });
});

describe('engine.applyAction(load-chamber)', () => {
  it('fills chamber and moves phase to turn-item', () => {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'B')];
    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });

    expect(result.state.chamber.bullets).toHaveLength(6);
    expect(result.state.chamber.liveCount + result.state.chamber.blankCount).toBe(6);
    expect(result.state.phase).toBe('turn-item');
  });

  it('emits chamber-loaded event', () => {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'B')];
    let state = applyAction(initGame(players, 42), { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });

    expect(
      result.events.find((event) => event.type === 'chamber-loaded'),
    ).toBeDefined();
  });

  it('resets per-chamber tracking', () => {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'B')];
    let state = initGame(players, 42);
    state = {
      ...state,
      extraTurnsUsedThisChamber: { a: 1 },
      itemsUsedThisTurn: { chocolate: true, magnifier: false },
    };
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });

    expect(result.state.extraTurnsUsedThisChamber).toEqual({});
    expect(result.state.itemsUsedThisTurn).toEqual({
      chocolate: false,
      magnifier: false,
    });
  });
});

describe('engine.applyAction(use-item)', () => {
  function setupTurn() {
    const players = [makePlayer('a', 'A'), makePlayer('b', 'B')];
    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;
    return state;
  }

  it('chocolate heals and decreases inventory', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      lives: 2,
      inventory: { chocolate: 1, magnifier: 1 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[currentIndex]?.lives).toBe(3);
    expect(result.state.players[currentIndex]?.inventory.chocolate).toBe(0);
  });

  it('chocolate caps at four lives', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      lives: 4,
      inventory: { chocolate: 1, magnifier: 1 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[currentIndex]?.lives).toBe(4);
  });

  it('throws if player has no item', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      inventory: { chocolate: 0, magnifier: 0 },
    };

    expect(() => applyAction(state, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });

  it('throws if item already used this turn', () => {
    let state = setupTurn();
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: true, magnifier: false },
    };

    expect(() => applyAction(state, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });

  it('emits item-used event and marks item as used', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      inventory: { chocolate: 1, magnifier: 1 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'magnifier' });

    expect(result.events.find((event) => event.type === 'item-used')).toBeDefined();
    expect(result.state.itemsUsedThisTurn.magnifier).toBe(true);
  });
});

describe('engine.applyAction(shoot)', () => {
  function setupThreePlayers(seed = 42) {
    const players = [
      makePlayer('a', 'A'),
      makePlayer('b', 'B'),
      makePlayer('c', 'C'),
    ];
    let state = initGame(players, seed);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;
    return state;
  }

  function withChamber(state: ReturnType<typeof setupThreePlayers>, bullets: Array<'live' | 'blank'>) {
    return {
      ...state,
      chamber: {
        bullets: [...bullets],
        liveCount: bullets.filter((bullet) => bullet === 'live').length,
        blankCount: bullets.filter((bullet) => bullet === 'blank').length,
      },
    };
  }

  it('self plus blank grants extra turn without life loss', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[shooterIndex]!.id,
    });

    expect(result.state.players[shooterIndex]?.lives).toBe(4);
    expect(result.state.currentPlayerIndex).toBe(shooterIndex);
    expect(result.events.some((event) => event.type === 'extra-turn-granted')).toBe(true);
  });

  it('self plus live removes life and passes turn', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = withChamber(state, ['live', 'blank']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[shooterIndex]!.id,
    });

    expect(result.state.players[shooterIndex]?.lives).toBe(3);
    expect(result.state.currentPlayerIndex).not.toBe(shooterIndex);
  });

  it('other plus live hurts target and passes turn', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const targetIndex = (shooterIndex + 1) % 3;
    state = withChamber(state, ['live', 'blank']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[targetIndex]!.id,
    });

    expect(result.state.players[targetIndex]?.lives).toBe(3);
    expect(result.state.currentPlayerIndex).not.toBe(shooterIndex);
  });

  it('other plus blank hurts nobody and passes turn', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const targetIndex = (shooterIndex + 1) % 3;
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[targetIndex]!.id,
    });

    expect(result.state.players[targetIndex]?.lives).toBe(4);
    expect(result.state.currentPlayerIndex).not.toBe(shooterIndex);
  });

  it('second self blank in same chamber hits extra-turn cap', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = withChamber(state, ['blank', 'blank', 'live']);

    let result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[shooterIndex]!.id,
    });

    expect(result.state.currentPlayerIndex).toBe(shooterIndex);

    result = applyAction(result.state, {
      type: 'shoot',
      targetId: result.state.players[shooterIndex]!.id,
    });

    expect(result.state.currentPlayerIndex).not.toBe(shooterIndex);
    expect(result.events.some((event) => event.type === 'extra-turn-cap-hit')).toBe(true);
  });

  it('marks eliminated player and emits elimination event', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const targetIndex = (shooterIndex + 1) % 3;
    state.players[targetIndex] = {
      ...state.players[targetIndex]!,
      lives: 1,
    };
    state = withChamber(state, ['live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[targetIndex]!.id,
    });

    expect(result.state.players[targetIndex]?.lives).toBe(0);
    expect(result.state.players[targetIndex]?.eliminated).toBe(true);
    expect(result.events.some((event) => event.type === 'player-eliminated')).toBe(true);
  });

  it('moves to between-rounds when chamber becomes empty', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = withChamber(state, ['blank']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[(shooterIndex + 1) % 3]!.id,
    });

    expect(result.state.chamber.bullets).toHaveLength(0);
    expect(result.state.phase).toBe('between-rounds');
  });

  it('ends game when only one alive player remains', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const shooterId = state.players[shooterIndex]!.id;
    const secondId = state.players[(shooterIndex + 1) % 3]!.id;
    const thirdId = state.players[(shooterIndex + 2) % 3]!.id;
    state.players = state.players.map((player) =>
      player.id === secondId
        ? { ...player, lives: 1 }
        : player.id === thirdId
          ? { ...player, lives: 0, eliminated: true }
          : player,
    );
    state = withChamber(state, ['live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: secondId,
    });

    expect(result.state.phase).toBe('game-over');
    expect(result.state.winnerId).toBe(shooterId);
  });

  it('throws when target is eliminated', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const targetIndex = (shooterIndex + 1) % 3;
    state.players[targetIndex] = {
      ...state.players[targetIndex]!,
      lives: 0,
      eliminated: true,
    };
    state = withChamber(state, ['live']);

    expect(() =>
      applyAction(state, {
        type: 'shoot',
        targetId: state.players[targetIndex]!.id,
      }),
    ).toThrow();
  });

  it('resets itemsUsedThisTurn after shot when turn passes', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: true, magnifier: true },
    };
    state = withChamber(state, ['live', 'blank']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[(shooterIndex + 1) % 3]!.id,
    });

    expect(result.state.itemsUsedThisTurn).toEqual({
      chocolate: false,
      magnifier: false,
    });
  });

  it('PRESERVES itemsUsedThisTurn when self+blank grants extra turn (no double-budget exploit)', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: false, magnifier: true },
    };
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[shooterIndex]!.id,
    });

    expect(result.state.currentPlayerIndex).toBe(shooterIndex);
    expect(result.state.itemsUsedThisTurn.magnifier).toBe(true);
    expect(result.state.itemsUsedThisTurn.chocolate).toBe(false);
  });

  it('RESETS itemsUsedThisTurn when extra-turn cap hit (turn passes)', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const shooterId = state.players[shooterIndex]!.id;
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: true, magnifier: true },
      extraTurnsUsedThisChamber: { [shooterId]: 1 },
    };
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: shooterId,
    });

    expect(result.state.currentPlayerIndex).not.toBe(shooterIndex);
    expect(result.state.itemsUsedThisTurn).toEqual({
      chocolate: false,
      magnifier: false,
    });
  });
});
