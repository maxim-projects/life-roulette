import { describe, expect, it } from 'vitest';
import { defaultClassState, initialPlayerForClass } from '../../src/game/classes';
import { applyAction, initGame } from '../../src/game/engine';
import type { ClassId, Player } from '../../src/game/types';

function makePlayer(id: string, name: string, isBot = false): Player {
  return {
    id,
    name,
    profileId: null,
    lives: 4,
    inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    isBot,
    eliminated: false,
    classId: null,
    classState: defaultClassState(),
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

  it('hydrates class-based lives, inventory and classState', () => {
    const players = [
      { ...makePlayer('double', 'Double'), classId: 'double' as const },
      { ...makePlayer('specops', 'Specops'), classId: 'specops' as const },
    ];

    const state = initGame(players, 42);
    const double = state.players.find((player) => player.id === 'double')!;
    const specops = state.players.find((player) => player.id === 'specops')!;

    expect(double.lives).toBe(5);
    expect(double.inventory.knife).toBe(1);
    expect(double.classState.knifeArmed).toBe(false);
    expect(specops.lives).toBe(4);
    expect(specops.classState.armorActive).toBe(true);
    expect(specops.classState.armorChargesLeft).toBe(3);
    expect(specops.classState.armorRoundsLeft).toBe(3);
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
      itemsUsedThisTurn: { chocolate: true, magnifier: false, knife: false },
    };
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });

    expect(result.state.extraTurnsUsedThisChamber).toEqual({});
    expect(result.state.itemsUsedThisTurn).toEqual({
      chocolate: false,
      magnifier: false,
      knife: false,
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
      inventory: { chocolate: 1, magnifier: 1, knife: 0 },
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
      inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[currentIndex]?.lives).toBe(4);
  });

  it('throws if player has no item', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      inventory: { chocolate: 0, magnifier: 0, knife: 0 },
    };

    expect(() => applyAction(state, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });

  it('throws if item already used this turn', () => {
    let state = setupTurn();
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: true, magnifier: false, knife: false },
    };

    expect(() => applyAction(state, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });

  it('emits item-used event and marks item as used', () => {
    let state = setupTurn();
    const currentIndex = state.currentPlayerIndex;
    state.players[currentIndex] = {
      ...state.players[currentIndex]!,
      inventory: { chocolate: 1, magnifier: 1, knife: 0 },
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
      itemsUsedThisTurn: { chocolate: true, magnifier: true, knife: false },
    };
    state = withChamber(state, ['live', 'blank']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[(shooterIndex + 1) % 3]!.id,
    });

    expect(result.state.itemsUsedThisTurn).toEqual({
      chocolate: false,
      magnifier: false,
      knife: false,
    });
  });

  it('PRESERVES itemsUsedThisTurn when self+blank grants extra turn (no double-budget exploit)', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: false, magnifier: true, knife: false },
    };
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, {
      type: 'shoot',
      targetId: state.players[shooterIndex]!.id,
    });

    expect(result.state.currentPlayerIndex).toBe(shooterIndex);
    expect(result.state.itemsUsedThisTurn.magnifier).toBe(true);
    expect(result.state.itemsUsedThisTurn.chocolate).toBe(false);
    expect(result.state.itemsUsedThisTurn.knife).toBe(false);
  });

  it('RESETS itemsUsedThisTurn when extra-turn cap hit (turn passes)', () => {
    let state = setupThreePlayers();
    const shooterIndex = state.currentPlayerIndex;
    const shooterId = state.players[shooterIndex]!.id;
    state = {
      ...state,
      itemsUsedThisTurn: { chocolate: true, magnifier: true, knife: false },
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
      knife: false,
    });
  });
});

describe('engine.applyAction(shoot) with classes', () => {
  function setup3pWithClasses(classes: Array<ClassId | null>) {
    const players = classes.map((classId, index) => ({
      ...makePlayer(`p${index}`, `P${index}`),
      classId,
      classState: initialPlayerForClass(classId),
      lives: classId === 'double' ? 5 : 4,
    }));

    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    return state;
  }

  function withChamber(state: ReturnType<typeof setup3pWithClasses>, bullets: Array<'live' | 'blank'>) {
    return {
      ...state,
      chamber: {
        bullets: [...bullets],
        liveCount: bullets.filter((bullet) => bullet === 'live').length,
        blankCount: bullets.filter((bullet) => bullet === 'blank').length,
      },
    };
  }

  it('Tank blocks first live bullet at him (lives unchanged)', () => {
    let state = setup3pWithClasses(['tank', null, null]);
    state.currentPlayerIndex = 1;
    state = withChamber(state, ['live']);

    const result = applyAction(state, { type: 'shoot', targetId: 'p0' });

    expect(result.state.players[0]!.lives).toBe(4);
    expect(result.state.players[0]!.classState.tankBlockUsed).toBe(true);
    expect(result.events.some((event) => event.type === 'tank-block-triggered')).toBe(true);
  });

  it('Specops takes 0.5 damage from live bullet (4 → 3.5)', () => {
    let state = setup3pWithClasses(['specops', null, null]);
    state.currentPlayerIndex = 1;
    state = withChamber(state, ['live']);

    const result = applyAction(state, { type: 'shoot', targetId: 'p0' });

    expect(result.state.players[0]!.lives).toBe(3.5);
    expect(result.state.players[0]!.classState.armorChargesLeft).toBe(2);
  });

  it('Double with knife armed deals 2 damage on live (target 4 → 2)', () => {
    let state = setup3pWithClasses(['double', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.knifeArmed = true;
    state = withChamber(state, ['live']);

    const result = applyAction(state, { type: 'shoot', targetId: 'p1' });

    expect(result.state.players[1]!.lives).toBe(2);
    expect(result.state.players[0]!.classState.knifeArmed).toBe(false);
    expect(result.state.players[0]!.classState.knifeUsed).toBe(true);
    expect(result.events.some((event) => event.type === 'knife-doubled-damage')).toBe(true);
  });

  it('Double knife survives blank (still armed after blank shot)', () => {
    let state = setup3pWithClasses(['double', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.knifeArmed = true;
    state = withChamber(state, ['blank', 'live']);

    const result = applyAction(state, { type: 'shoot', targetId: 'p1' });

    expect(result.state.players[0]!.classState.knifeArmed).toBe(true);
    expect(result.state.players[0]!.classState.knifeUsed).toBe(false);
  });

  it('Knife + Specops armor: 2x damage halved = 1 damage', () => {
    let state = setup3pWithClasses(['double', 'specops', null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.knifeArmed = true;
    state = withChamber(state, ['live']);

    const result = applyAction(state, { type: 'shoot', targetId: 'p1' });

    expect(result.state.players[1]!.lives).toBe(3);
  });
});

describe('engine.applyAction(use-item chocolate) with class', () => {
  function setup3pWithClasses(classes: Array<ClassId | null>) {
    const players = classes.map((classId, index) => ({
      ...makePlayer(`p${index}`, `P${index}`),
      classId,
      classState: initialPlayerForClass(classId),
      lives: classId === 'double' ? 5 : 4,
    }));

    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    return state;
  }

  it('Medic chocolate heals +3 (lives 1 → 4)', () => {
    let state = setup3pWithClasses(['medic', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0] = {
      ...state.players[0]!,
      lives: 1,
      inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[0]!.lives).toBe(4);
  });

  it('Medic chocolate caps at 4 (lives 3 + 3 = capped 4)', () => {
    let state = setup3pWithClasses(['medic', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0] = {
      ...state.players[0]!,
      lives: 3,
      inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[0]!.lives).toBe(4);
  });

  it('Double has cap 5 (lives 5 → chocolate at 4 → 5)', () => {
    let state = setup3pWithClasses(['double', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0] = {
      ...state.players[0]!,
      lives: 4,
      inventory: { chocolate: 1, magnifier: 1, knife: 1 },
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[0]!.lives).toBe(5);
  });

  it('Classless chocolate heals +1 (lives 2 → 3)', () => {
    let state = setup3pWithClasses([null, null, null]);
    state.currentPlayerIndex = 0;
    state.players[0] = {
      ...state.players[0]!,
      lives: 2,
    };

    const result = applyAction(state, { type: 'use-item', itemId: 'chocolate' });

    expect(result.state.players[0]!.lives).toBe(3);
  });
});

describe('engine.applyAction(use-item knife)', () => {
  function setup3pWithClasses(classes: Array<ClassId | null>) {
    const players = classes.map((classId, index) => ({
      ...makePlayer(`p${index}`, `P${index}`),
      classId,
      classState: initialPlayerForClass(classId),
      lives: classId === 'double' ? 5 : 4,
      inventory:
        classId === 'double'
          ? { chocolate: 1, magnifier: 1, knife: 1 }
          : { chocolate: 1, magnifier: 1, knife: 0 },
    }));

    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    return state;
  }

  it('Double can arm knife once: knifeArmed=true, inventory.knife=0', () => {
    let state = setup3pWithClasses(['double', null, null]);
    state.currentPlayerIndex = 0;

    const result = applyAction(state, { type: 'use-item', itemId: 'knife' });

    expect(result.state.players[0]!.classState.knifeArmed).toBe(true);
    expect(result.state.players[0]!.inventory.knife).toBe(0);
    expect(result.events.some((event) => event.type === 'knife-armed')).toBe(true);
  });

  it('Non-Double cannot use knife (no knife in inventory)', () => {
    let state = setup3pWithClasses([null, null, null]);
    state.currentPlayerIndex = 0;

    expect(() => applyAction(state, { type: 'use-item', itemId: 'knife' })).toThrow();
  });

  it('Cannot arm knife twice (already armed → throws)', () => {
    let state = setup3pWithClasses(['double', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.knifeArmed = true;
    state.players[0]!.inventory.knife = 0;

    expect(() => applyAction(state, { type: 'use-item', itemId: 'knife' })).toThrow();
  });
});

describe('engine.applyAction(use-ability lightning)', () => {
  function setup3pWithClasses(classes: Array<ClassId | null>) {
    const players = classes.map((classId, index) => ({
      ...makePlayer(`p${index}`, `P${index}`),
      classId,
      classState: initialPlayerForClass(classId),
      lives: classId === 'double' ? 5 : 4,
      inventory:
        classId === 'double'
          ? { chocolate: 1, magnifier: 1, knife: 1 }
          : { chocolate: 1, magnifier: 1, knife: 0 },
    }));

    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    return state;
  }

  it('God damages target with lightning (1 dmg)', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;
    state.phase = 'turn-item';

    const result = applyAction(state, {
      type: 'use-ability',
      ability: 'lightning',
      targetId: 'p1',
    });

    expect(result.state.players[1]!.lives).toBe(3);
    expect(result.state.players[0]!.classState.lightningTotalUsed).toBe(1);
    expect(result.state.players[0]!.classState.lightningUsedThisChamber).toBe(true);
    expect(result.events.some((event) => event.type === 'lightning-cast')).toBe(true);
  });

  it('Non-God throws on lightning', () => {
    let state = setup3pWithClasses([null, null, null]);
    state.currentPlayerIndex = 0;

    expect(() =>
      applyAction(state, {
        type: 'use-ability',
        ability: 'lightning',
        targetId: 'p1',
      }),
    ).toThrow();
  });

  it('Cannot lightning self', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;

    expect(() =>
      applyAction(state, {
        type: 'use-ability',
        ability: 'lightning',
        targetId: 'p0',
      }),
    ).toThrow();
  });

  it('Lightning blocked by Specops armor (1 → 0.5)', () => {
    let state = setup3pWithClasses(['god', 'specops', null]);
    state.currentPlayerIndex = 0;

    const result = applyAction(state, {
      type: 'use-ability',
      ability: 'lightning',
      targetId: 'p1',
    });

    expect(result.state.players[1]!.lives).toBe(3.5);
  });

  it('Lightning NOT blocked by Tank (Tank blocks bullets only)', () => {
    let state = setup3pWithClasses(['god', 'tank', null]);
    state.currentPlayerIndex = 0;

    const result = applyAction(state, {
      type: 'use-ability',
      ability: 'lightning',
      targetId: 'p1',
    });

    expect(result.state.players[1]!.lives).toBe(3);
    expect(result.state.players[1]!.classState.tankBlockUsed).toBe(false);
  });

  it('Cannot use lightning twice in same chamber', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.lightningUsedThisChamber = true;

    expect(() =>
      applyAction(state, {
        type: 'use-ability',
        ability: 'lightning',
        targetId: 'p1',
      }),
    ).toThrow();
  });

  it('Cannot use lightning if total limit reached (4)', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.lightningTotalUsed = 4;

    expect(() =>
      applyAction(state, {
        type: 'use-ability',
        ability: 'lightning',
        targetId: 'p1',
      }),
    ).toThrow();
  });

  it('Lightning does not change phase (shoot still required)', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;
    state.phase = 'turn-item';

    const result = applyAction(state, {
      type: 'use-ability',
      ability: 'lightning',
      targetId: 'p1',
    });

    expect(result.state.phase).toBe('turn-item');
  });
});

describe('engine.applyAction(load-chamber) resets per-chamber class state', () => {
  function setup3pWithClasses(classes: Array<ClassId | null>) {
    const players = classes.map((classId, index) => ({
      ...makePlayer(`p${index}`, `P${index}`),
      classId,
      classState: initialPlayerForClass(classId),
      lives: classId === 'double' ? 5 : 4,
      inventory:
        classId === 'double'
          ? { chocolate: 1, magnifier: 1, knife: 1 }
          : { chocolate: 1, magnifier: 1, knife: 0 },
    }));

    let state = initGame(players, 42);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    return state;
  }

  it('God lightning per-chamber resets to false on new chamber', () => {
    let state = setup3pWithClasses(['god', null, null]);
    state.currentPlayerIndex = 0;
    state.players[0]!.classState.lightningUsedThisChamber = true;
    state.phase = 'between-rounds';
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });
    const god = result.state.players.find((player) => player.classId === 'god')!;

    expect(god.classState.lightningUsedThisChamber).toBe(false);
  });

  it('Specops armor decrements armorRoundsLeft on load-chamber', () => {
    let state = setup3pWithClasses(['specops', null, null]);
    state.phase = 'between-rounds';
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });
    const specops = result.state.players.find((player) => player.classId === 'specops')!;

    expect(specops.classState.armorRoundsLeft).toBe(1);
    expect(specops.classState.armorActive).toBe(true);
  });

  it('Specops armor breaks when armorRoundsLeft reaches 0', () => {
    let state = setup3pWithClasses(['specops', null, null]);
    state.players[0]!.classState.armorRoundsLeft = 1;
    state.phase = 'between-rounds';
    state = applyAction(state, { type: 'spin-roulette' }).state;

    const result = applyAction(state, { type: 'load-chamber' });
    const specops = result.state.players.find((player) => player.classId === 'specops')!;

    expect(specops.classState.armorActive).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === 'armor-broke' && (event as { playerId: string }).playerId === 'p0',
      ),
    ).toBe(true);
  });
});
