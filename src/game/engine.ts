import { fireBullet, generateChamber } from './chamber';
import { createRng } from './rng';
import type { Action, GameEvent, GameState, Player } from './types';

function nextAliveIndex(players: Player[], fromIndex: number): number {
  const totalPlayers = players.length;

  for (let step = 1; step <= totalPlayers; step += 1) {
    const nextIndex = (fromIndex + step) % totalPlayers;

    if (!players[nextIndex]!.eliminated) {
      return nextIndex;
    }
  }

  return fromIndex;
}

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
    case 'shoot': {
      const shooter = state.players[state.currentPlayerIndex]!;
      const target = state.players.find((player) => player.id === action.targetId);

      if (!target) {
        throw new Error(`Target ${action.targetId} not found`);
      }

      if (target.eliminated) {
        throw new Error(`Target ${action.targetId} is eliminated`);
      }

      const fired = fireBullet(state.chamber);
      const isSelfShot = target.id === shooter.id;

      events.push({
        type: 'shot-fired',
        shooterId: shooter.id,
        targetId: target.id,
        bullet: fired.bullet,
      });

      const players = [...state.players];
      const extraTurns = { ...state.extraTurnsUsedThisChamber };
      let nextPlayerIndex = state.currentPlayerIndex;
      let phase = state.phase;
      let winnerId = state.winnerId;

      if (fired.bullet === 'live') {
        const targetIndex = players.findIndex((player) => player.id === target.id);
        const previousTarget = players[targetIndex]!;
        const nextLives = Math.max(previousTarget.lives - 1, 0);
        const eliminated = nextLives <= 0;

        players[targetIndex] = {
          ...previousTarget,
          lives: nextLives,
          eliminated,
        };

        events.push({
          type: 'lives-changed',
          playerId: target.id,
          newLives: nextLives,
        });

        if (eliminated) {
          events.push({
            type: 'player-eliminated',
            playerId: target.id,
          });
        }
      }

      const grantsExtraTurn =
        isSelfShot &&
        fired.bullet === 'blank' &&
        !players[state.currentPlayerIndex]!.eliminated;
      const usedSoFar = extraTurns[shooter.id] ?? 0;
      const capHit = grantsExtraTurn && usedSoFar >= 1;

      if (grantsExtraTurn && !capHit) {
        extraTurns[shooter.id] = usedSoFar + 1;
        events.push({
          type: 'extra-turn-granted',
          playerId: shooter.id,
        });
      } else {
        if (capHit) {
          events.push({
            type: 'extra-turn-cap-hit',
            playerId: shooter.id,
          });
        }

        nextPlayerIndex = nextAliveIndex(players, state.currentPlayerIndex);

        if (!players[nextPlayerIndex]!.eliminated) {
          events.push({
            type: 'turn-changed',
            nextPlayerId: players[nextPlayerIndex]!.id,
          });
        }
      }

      const alivePlayers = players.filter((player) => !player.eliminated);

      if (alivePlayers.length === 1) {
        winnerId = alivePlayers[0]!.id;
        phase = 'game-over';
        events.push({
          type: 'game-over',
          winnerId,
        });
      } else if (fired.chamber.bullets.length === 0) {
        phase = 'between-rounds';
        events.push({ type: 'chamber-empty' });
      } else {
        phase = 'turn-item';
      }

      return {
        state: {
          ...state,
          players,
          chamber: fired.chamber,
          currentPlayerIndex: nextPlayerIndex,
          phase,
          extraTurnsUsedThisChamber: extraTurns,
          itemsUsedThisTurn: { chocolate: false, magnifier: false },
          winnerId,
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
    default:
      throw new Error('Unsupported action type');
  }
}
