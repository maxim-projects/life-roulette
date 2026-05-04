import { generateChamber } from './chamber';
import { createRng } from './rng';
import type { Action, GameEvent, GameState, Player } from './types';

export function initGame(players: Player[], seed: number): GameState {
  if (players.length < 2 || players.length > 7) {
    throw new Error(`Invalid player count: ${players.length}`);
  }

  return {
    players: players.map((player) => ({
      ...player,
      lives: 4,
      eliminated: false,
    })),
    currentPlayerIndex: 0,
    chamber: { bullets: [], liveCount: 0, blankCount: 0 },
    phase: 'roulette',
    rngSeed: seed,
    rngState: seed >>> 0,
    extraTurnsUsedThisChamber: {},
    itemsUsedThisTurn: { chocolate: false, magnifier: false },
    winnerId: null,
    actionLog: [],
  };
}

export function applyAction(
  state: GameState,
  action: Action,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const rng = createRng(0);
  rng.fromState(state.rngState);

  switch (action.type) {
    case 'spin-roulette': {
      const aliveIndices = state.players
        .map((player, index) => (player.eliminated ? -1 : index))
        .filter((index) => index >= 0);

      if (aliveIndices.length === 0) {
        throw new Error('No alive players');
      }

      const pickedIndex = aliveIndices[rng.intRange(0, aliveIndices.length - 1)]!;

      events.push({
        type: 'roulette-spun',
        firstPlayerId: state.players[pickedIndex]!.id,
      });

      return {
        state: {
          ...state,
          currentPlayerIndex: pickedIndex,
          phase: 'loading',
          rngState: rng.toState(),
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
    case 'load-chamber': {
      const chamber = generateChamber(rng);

      events.push({
        type: 'chamber-loaded',
        liveCount: chamber.liveCount,
        blankCount: chamber.blankCount,
      });

      return {
        state: {
          ...state,
          chamber,
          phase: 'turn-item',
          rngState: rng.toState(),
          extraTurnsUsedThisChamber: {},
          itemsUsedThisTurn: { chocolate: false, magnifier: false },
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}
