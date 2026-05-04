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
    case 'use-item': {
      const player = state.players[state.currentPlayerIndex]!;
      const itemCount = player.inventory[action.itemId] ?? 0;

      if (itemCount <= 0) {
        throw new Error(`No ${action.itemId}`);
      }

      if (state.itemsUsedThisTurn[action.itemId]) {
        throw new Error(`${action.itemId} already used this turn`);
      }

      const nextInventory = {
        ...player.inventory,
        [action.itemId]: itemCount - 1,
      };

      let nextLives = player.lives;

      if (action.itemId === 'chocolate') {
        nextLives = Math.min(player.lives + 1, 4);

        if (nextLives !== player.lives) {
          events.push({
            type: 'lives-changed',
            playerId: player.id,
            newLives: nextLives,
          });
        }
      }

      const nextPlayers = state.players.map((candidate, index) =>
        index === state.currentPlayerIndex
          ? {
              ...candidate,
              inventory: nextInventory,
              lives: nextLives,
            }
          : candidate,
      );

      events.push({
        type: 'item-used',
        playerId: player.id,
        itemId: action.itemId,
      });

      return {
        state: {
          ...state,
          players: nextPlayers,
          itemsUsedThisTurn: {
            ...state.itemsUsedThisTurn,
            [action.itemId]: true,
          },
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}
