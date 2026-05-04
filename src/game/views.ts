import type { GameState, PlayerView } from './types';

export function getPlayerView(state: GameState, playerId: string): PlayerView {
  const selfPlayer = state.players.find((player) => player.id === playerId);

  if (!selfPlayer) {
    throw new Error(`Player ${playerId} not in state`);
  }

  return {
    selfPlayer,
    otherPlayers: state.players
      .filter((player) => player.id !== playerId)
      .map((player) => ({
        id: player.id,
        name: player.name,
        lives: player.lives,
        eliminated: player.eliminated,
      })),
    chamberLive: state.chamber.liveCount,
    chamberBlank: state.chamber.blankCount,
    currentPlayerId: state.players[state.currentPlayerIndex]!.id,
    phase: state.phase,
  };
}
