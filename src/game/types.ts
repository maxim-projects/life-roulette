export type ItemId = 'chocolate' | 'magnifier';
export type Bullet = 'live' | 'blank';

export interface Player {
  id: string;
  name: string;
  profileId: string | null;
  lives: number;
  inventory: Record<ItemId, number>;
  isBot: boolean;
  eliminated: boolean;
}

export interface Chamber {
  bullets: Bullet[];
  liveCount: number;
  blankCount: number;
}

export type GamePhase =
  | 'menu'
  | 'profile-select'
  | 'roulette'
  | 'loading'
  | 'turn-item'
  | 'turn-shot'
  | 'turn-resolve'
  | 'pass-device'
  | 'paused'
  | 'between-rounds'
  | 'game-over'
  | 'shop';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  chamber: Chamber;
  phase: GamePhase;
  rngSeed: number;
  rngState: number;
  extraTurnsUsedThisChamber: Record<string, number>;
  itemsUsedThisTurn: Record<ItemId, boolean>;
  winnerId: string | null;
  actionLog: Action[];
}

export type Action =
  | { type: 'spin-roulette' }
  | { type: 'load-chamber' }
  | { type: 'use-item'; itemId: ItemId }
  | { type: 'shoot'; targetId: string };

export type GameEvent =
  | { type: 'roulette-spun'; firstPlayerId: string }
  | { type: 'chamber-loaded'; liveCount: number; blankCount: number }
  | { type: 'item-used'; playerId: string; itemId: ItemId }
  | { type: 'shot-fired'; shooterId: string; targetId: string; bullet: Bullet }
  | { type: 'lives-changed'; playerId: string; newLives: number }
  | { type: 'extra-turn-granted'; playerId: string }
  | { type: 'extra-turn-cap-hit'; playerId: string }
  | { type: 'player-eliminated'; playerId: string }
  | { type: 'turn-changed'; nextPlayerId: string }
  | { type: 'chamber-empty' }
  | { type: 'game-over'; winnerId: string };

export interface PlayerView {
  selfPlayer: Player;
  otherPlayers: ReadonlyArray<{
    id: string;
    name: string;
    lives: number;
    eliminated: boolean;
  }>;
  chamberLive: number;
  chamberBlank: number;
  currentPlayerId: string;
  phase: GamePhase;
}
