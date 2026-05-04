import { describe, expect, it } from 'vitest';
import { defaultClassState } from '../../src/game/classes';
import { applyAction, initGame } from '../../src/game/engine';
import { getPlayerView } from '../../src/game/views';
import type { Player } from '../../src/game/types';

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  profileId: null,
  lives: 4,
  inventory: { chocolate: 1, magnifier: 1, knife: 0 },
  isBot: false,
  eliminated: false,
  classId: null,
  classState: defaultClassState(),
});

describe('getPlayerView', () => {
  it('returns self player by id', () => {
    expect(
      getPlayerView(initGame([makePlayer('a', 'A'), makePlayer('b', 'B')], 1), 'a')
        .selfPlayer.id,
    ).toBe('a');
  });

  it('excludes self from others and hides private fields', () => {
    const view = getPlayerView(
      initGame([makePlayer('a', 'A'), makePlayer('b', 'B'), makePlayer('c', 'C')], 1),
      'a',
    );

    expect(view.otherPlayers.map((player) => player.id)).toEqual(['b', 'c']);
    expect((view.otherPlayers[0] as unknown as { inventory?: unknown }).inventory).toBeUndefined();
  });

  it('reflects chamber counts from state', () => {
    let state = initGame([makePlayer('a', 'A'), makePlayer('b', 'B')], 1);
    state = applyAction(state, { type: 'spin-roulette' }).state;
    state = applyAction(state, { type: 'load-chamber' }).state;

    const view = getPlayerView(state, 'a');

    expect(view.chamberLive).toBe(state.chamber.liveCount);
    expect(view.chamberBlank).toBe(state.chamber.blankCount);
  });

  it('throws on unknown player id', () => {
    expect(() =>
      getPlayerView(initGame([makePlayer('a', 'A'), makePlayer('b', 'B')], 1), 'zzz'),
    ).toThrow();
  });

  it('otherPlayers expose classId (public info)', () => {
    const state = initGame(
      [
        { ...makePlayer('a', 'A'), classId: 'medic' },
        { ...makePlayer('b', 'B'), classId: null },
      ],
      1,
    );

    const view = getPlayerView(state, 'a');

    expect(view.otherPlayers[0]!.classId).toBe(null);
    expect((view.otherPlayers[0] as unknown as { classState?: unknown }).classState).toBeUndefined();
  });
});
