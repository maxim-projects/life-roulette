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
