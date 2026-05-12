import {
  classMaxLives,
  classStartingInventory,
  classStartingLives,
  initialPlayerForClass,
} from './classes';
import { fireBullet, generateChamber } from './chamber';
import { resolveDamage } from './damage';
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
    players: players.map((player) => {
      const startInventory = classStartingInventory(player.classId);

      return {
        ...player,
        lives: classStartingLives(player.classId),
        inventory: {
          chocolate: Math.max(player.inventory.chocolate, startInventory.chocolate),
          magnifier: Math.max(player.inventory.magnifier, startInventory.magnifier),
          knife: Math.max(player.inventory.knife, startInventory.knife),
          super: Math.max(player.inventory.super ?? 0, startInventory.super),
        },
        classState: initialPlayerForClass(player.classId),
        eliminated: false,
      };
    }),
    currentPlayerIndex: 0,
    chamber: { bullets: [], liveCount: 0, blankCount: 0 },
    phase: 'roulette',
    rngSeed: seed,
    rngState: seed >>> 0,
    extraTurnsUsedThisChamber: {},
    itemsUsedThisTurn: { chocolate: false, magnifier: false, knife: false, super: false },
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
      const players = state.players.map((player) => {
        let classState = {
          ...player.classState,
          lightningUsedThisChamber: false,
          killUsedThisChamber: false,
        };

        if (player.classId === 'specops' && classState.armorActive) {
          const newRounds = classState.armorRoundsLeft - 1;
          const broke = newRounds <= 0;
          classState = {
            ...classState,
            armorRoundsLeft: newRounds,
            armorActive: broke ? false : classState.armorActive,
          };
          if (broke) {
            events.push({ type: 'armor-broke', playerId: player.id });
          }
        }

        return {
          ...player,
          classState,
        };
      });

      events.push({
        type: 'chamber-loaded',
        liveCount: chamber.liveCount,
        blankCount: chamber.blankCount,
      });

      return {
        state: {
          ...state,
          chamber,
          players,
          phase: 'turn-item',
          rngState: rng.toState(),
          extraTurnsUsedThisChamber: {},
          itemsUsedThisTurn: { chocolate: false, magnifier: false, knife: false, super: false },
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
      let nextClassState = player.classState;

      if (action.itemId === 'chocolate') {
        const heal = player.classId === 'medic' ? 3 : 1;
        const maxLives = classMaxLives(player.classId);
        nextLives = Math.min(player.lives + heal, maxLives);

        if (nextLives !== player.lives) {
          events.push({
            type: 'lives-changed',
            playerId: player.id,
            newLives: nextLives,
          });
        }
      }

      if (action.itemId === 'knife') {
        if (player.classId !== 'double') {
          throw new Error('Only Double can use knife');
        }

        if (player.classState.knifeArmed) {
          throw new Error('Knife already armed');
        }

        if (player.classState.knifeUsed) {
          throw new Error('Knife already used this game');
        }

        nextClassState = {
          ...nextClassState,
          knifeArmed: true,
        };
        events.push({ type: 'knife-armed', playerId: player.id });
      }

      if (action.itemId === 'super') {
        if (player.classState.superArmed) {
          throw new Error('Super-патрон уже взведён');
        }
        nextClassState = {
          ...nextClassState,
          superArmed: true,
        };
        events.push({ type: 'super-armed', playerId: player.id });
      }

      const nextPlayers = state.players.map((candidate, index) =>
        index === state.currentPlayerIndex
          ? {
              ...candidate,
              inventory: nextInventory,
              lives: nextLives,
              classState: nextClassState,
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
    case 'use-ability': {
      const caster = state.players[state.currentPlayerIndex]!;

      // Тёмный Киллер: способность "Убить" — мгновенно eliminates цели.
      if (action.ability === 'kill') {
        if (caster.classId !== 'darkkiller') {
          throw new Error('Only darkkiller can use kill');
        }
        if (caster.classState.killUsedThisChamber) {
          throw new Error('Kill already used this chamber');
        }
        if (caster.classState.killTotalUsed >= 3) {
          throw new Error('Kill total limit reached');
        }

        const targetIdx = state.players.findIndex((p) => p.id === action.targetId);
        if (targetIdx < 0) throw new Error(`Target ${action.targetId} not found`);
        const target = state.players[targetIdx]!;
        if (target.eliminated) throw new Error('Target eliminated');
        if (target.id === caster.id) throw new Error('Cannot kill self');

        const nextPlayers = [...state.players];
        nextPlayers[targetIdx] = { ...target, lives: 0, eliminated: true };
        nextPlayers[state.currentPlayerIndex] = {
          ...caster,
          classState: {
            ...caster.classState,
            killUsedThisChamber: true,
            killTotalUsed: caster.classState.killTotalUsed + 1,
          },
        };

        events.push({ type: 'kill-used', killerId: caster.id, targetId: target.id });
        events.push({ type: 'lives-changed', playerId: target.id, newLives: 0 });
        events.push({ type: 'player-eliminated', playerId: target.id });

        // Если остался один живой → game-over
        const alive = nextPlayers.filter((p) => !p.eliminated);
        let nextPhase: typeof state.phase = state.phase;
        let winnerId = state.winnerId;
        if (alive.length === 1) {
          nextPhase = 'game-over';
          winnerId = alive[0]!.id;
          events.push({ type: 'game-over', winnerId });
        }

        return {
          state: {
            ...state,
            players: nextPlayers,
            phase: nextPhase,
            winnerId,
            actionLog: [...state.actionLog, action],
          },
          events,
        };
      }

      if (action.ability !== 'lightning') {
        throw new Error(`Unknown ability: ${String(action.ability)}`);
      }

      if (caster.classId !== 'god') {
        throw new Error('Only god can cast lightning');
      }

      if (caster.classState.lightningUsedThisChamber) {
        throw new Error('Lightning already used this chamber');
      }

      if (caster.classState.lightningTotalUsed >= 4) {
        throw new Error('Lightning total limit reached');
      }

      const targetIndex = state.players.findIndex((player) => player.id === action.targetId);

      if (targetIndex < 0) {
        throw new Error(`Target ${action.targetId} not found`);
      }

      const target = state.players[targetIndex]!;

      if (target.eliminated) {
        throw new Error('Target eliminated');
      }

      if (target.id === caster.id) {
        throw new Error('Cannot cast lightning on self');
      }

      const damageResult = resolveDamage(target, 1, 'lightning');
      const finalDamage = damageResult.finalDamage;
      const newLives = Math.max(target.lives - finalDamage, 0);
      const eliminated = newLives <= 0;
      const nextPlayers = [...state.players];

      nextPlayers[targetIndex] = {
        ...target,
        lives: newLives,
        eliminated,
        classState: damageResult.updatedClassState,
      };
      nextPlayers[state.currentPlayerIndex] = {
        ...caster,
        classState: {
          ...caster.classState,
          lightningUsedThisChamber: true,
          lightningTotalUsed: caster.classState.lightningTotalUsed + 1,
        },
      };

      events.push(...damageResult.events);
      events.push({
        type: 'lightning-cast',
        casterId: caster.id,
        targetId: target.id,
        damage: finalDamage,
      });

      if (finalDamage > 0) {
        events.push({
          type: 'lives-changed',
          playerId: target.id,
          newLives,
        });
      }

      if (eliminated && !target.eliminated) {
        events.push({
          type: 'player-eliminated',
          playerId: target.id,
        });
      }

      return {
        state: {
          ...state,
          players: nextPlayers,
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
        let baseDamage = 1;
        const shooterIndex = state.currentPlayerIndex;

        if (shooter.classId === 'double' && shooter.classState.knifeArmed) {
          baseDamage *= 2;
          players[shooterIndex] = {
            ...shooter,
            classState: {
              ...shooter.classState,
              knifeArmed: false,
              knifeUsed: true,
            },
          };
          events.push({ type: 'knife-doubled-damage', playerId: shooter.id });
        }

        // Super-патрон: рискованный выстрел. 50/50 — либо удвоенный урон, либо промах (0).
        // Стакается с knife: при попадании Двойник + super → 4x урон.
        // RNG детерминированный из state.rngState (seeded), для тестов и онлайн-readiness.
        const shooterAfterKnife = players[shooterIndex]!;
        if (shooterAfterKnife.classState.superArmed) {
          const superHit = rng.next() < 0.5;
          if (superHit) {
            baseDamage *= 2;
            events.push({ type: 'super-doubled-damage', playerId: shooterAfterKnife.id });
          } else {
            baseDamage = 0;
            events.push({ type: 'super-missed', playerId: shooterAfterKnife.id });
          }
          players[shooterIndex] = {
            ...shooterAfterKnife,
            classState: {
              ...shooterAfterKnife.classState,
              superArmed: false,
            },
          };
        }

        const targetIndex = players.findIndex((player) => player.id === target.id);
        const targetCurrent = players[targetIndex]!;
        const damageResult = resolveDamage(targetCurrent, baseDamage, 'bullet');
        const damage = damageResult.finalDamage;
        const nextLives = Math.max(targetCurrent.lives - damage, 0);
        const eliminated = nextLives <= 0;

        events.push(...damageResult.events);

        players[targetIndex] = {
          ...targetCurrent,
          lives: nextLives,
          eliminated,
          classState: damageResult.updatedClassState,
        };

        if (damage > 0) {
          events.push({
            type: 'lives-changed',
            playerId: target.id,
            newLives: nextLives,
          });
        }

        if (eliminated && !targetCurrent.eliminated) {
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

      // Reset itemsUsedThisTurn ONLY when the turn passes to a different
      // player. When extra-turn is granted (blank self-shot, cap not hit),
      // the same player keeps playing, and their per-turn item budget must
      // not refresh — otherwise a player can chain peek+self-shoot to
      // monopolize the chamber.
      const turnPasses = !grantsExtraTurn || capHit;
      const nextItemsUsedThisTurn = turnPasses
        ? { chocolate: false, magnifier: false, knife: false, super: false }
        : state.itemsUsedThisTurn;

      return {
        state: {
          ...state,
          players,
          chamber: fired.chamber,
          currentPlayerIndex: nextPlayerIndex,
          phase,
          extraTurnsUsedThisChamber: extraTurns,
          itemsUsedThisTurn: nextItemsUsedThisTurn,
          rngState: rng.toState(),
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
