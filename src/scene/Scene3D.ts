import type { Bullet, ItemId, Player } from '../game/types';

export interface Scene3D {
  init(canvas: HTMLCanvasElement, players: Player[]): Promise<void>;
  setActivePlayer(playerId: string): Promise<void>;
  showRouletteSpin(stoppedAtPlayerId: string): Promise<void>;
  showShoot(shooterId: string, targetId: string, bullet: Bullet): Promise<void>;
  showReload(): Promise<void>;
  showLifeChange(playerId: string, delta: number): Promise<void>;
  showItemUse(playerId: string, itemId: ItemId): Promise<void>;
  showWinner(playerId: string): Promise<void>;
  requestTargetSelection(eligibleIds: string[]): Promise<string>;
  pause(): void;
  resume(): void;
  dispose(): void;
}
