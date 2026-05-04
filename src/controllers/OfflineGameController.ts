import { botDecide } from '../game/bot';
import { applyAction } from '../game/engine';
import { createRng } from '../game/rng';
import { getPlayerView } from '../game/views';
import type { Action, Bullet, GameEvent, GameState, Player } from '../game/types';
import { getProfile, updateProfile } from '../persistence/profiles';
import { clearMidGame, loadMidGame, saveMidGame } from '../persistence/mid-game';
import type { Scene3D } from '../scene/Scene3D';
import { showConfirmDialog } from '../hud/ConfirmDialog';
import { mountPassDeviceScreen, type MountableHud } from '../hud/PassDeviceScreen';
import { mountPrivatePeekScreen } from '../hud/PrivatePeekScreen';
import { mountWinnerScreen } from '../hud/WinnerScreen';
import type { PlayerListHudProps } from '../hud/PlayerListHud';
import type { ItemBarHudProps } from '../hud/ItemBarHud';
import type { ActionMenuHudProps } from '../hud/ActionMenuHud';
import type { BulletCounterHudProps } from '../hud/BulletCounterHud';
import { attachVisibilityHandler } from './visibility';

class TurnPrivacy {
  private readonly peekedByPlayer: Record<string, Bullet> = {};

  clearForPlayer(id: string): void {
    delete this.peekedByPlayer[id];
  }

  setForPlayer(id: string, bullet: Bullet): void {
    this.peekedByPlayer[id] = bullet;
  }

  getForPlayer(id: string): Bullet | undefined {
    return this.peekedByPlayer[id];
  }
}

interface OfflineGameControllerOptions {
  root: HTMLElement;
  initialState: GameState;
  scene: Scene3D;
  huds: {
    playerList: MountableHud<PlayerListHudProps>;
    itemBar: MountableHud<ItemBarHudProps>;
    actionMenu: MountableHud<ActionMenuHudProps>;
    bulletCounter: MountableHud<BulletCounterHudProps>;
  };
  mode: 'vs-ai' | 'hot-seat';
  profileMap: Map<string, string | null>;
  onExit: () => void;
}

export class OfflineGameController {
  private state: GameState;
  private readonly scene: Scene3D;
  private readonly root: HTMLElement;
  private readonly huds: OfflineGameControllerOptions['huds'];
  private readonly mode: OfflineGameControllerOptions['mode'];
  private readonly profileMap: Map<string, string | null>;
  private readonly onExit: () => void;
  private readonly privacy = new TurnPrivacy();
  private stopVisibility: (() => void) | null = null;
  private humanResolver: ((action: Action) => void) | null = null;
  private awaitingHuman = false;
  private lastPresentedPlayerId: string | null = null;
  private disposed = false;

  constructor(options: OfflineGameControllerOptions) {
    this.root = options.root;
    this.state = options.initialState;
    this.scene = options.scene;
    this.huds = options.huds;
    this.mode = options.mode;
    this.profileMap = options.profileMap;
    this.onExit = options.onExit;
    this.wireHudCallbacks();
  }

  async start(): Promise<void> {
    this.stopVisibility = attachVisibilityHandler(
      () => {
        saveMidGame(this.state);
        this.scene.pause();
      },
      () => {
        const restored = loadMidGame();
        if (restored) {
          this.state = restored;
          this.render();
        }
        this.scene.resume();
      },
    );

    this.render();
    await this.beginRound();

    while (!this.disposed && this.state.phase !== 'game-over') {
      await this.runTurn();

      if (this.state.phase === 'between-rounds') {
        await this.beginRound();
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopVisibility?.();
    this.stopVisibility = null;
  }

  private wireHudCallbacks(): void {
    this.huds.itemBar.update({
      inventory: { chocolate: 0, magnifier: 0 },
      itemsUsed: { chocolate: false, magnifier: false },
      onUseItem: (itemId) => {
        if (!this.awaitingHuman || !this.humanResolver) {
          return;
        }
        this.resolveHumanAction({ type: 'use-item', itemId });
      },
    });

    this.huds.actionMenu.update({
      canShoot: false,
      onShoot: async () => {
        if (!this.awaitingHuman || !this.humanResolver) {
          return;
        }

        const currentPlayer = this.state.players[this.state.currentPlayerIndex];
        if (!currentPlayer) {
          return;
        }

        const eligibleTargets = this.state.players
          .filter((player) => !player.eliminated)
          .map((player) => player.id);
        const targetId = await this.scene.requestTargetSelection(eligibleTargets);
        const target = this.state.players.find((player) => player.id === targetId);

        if (!target) {
          return;
        }

        await new Promise<void>((resolve) => {
          showConfirmDialog(this.root, {
            message: `Стрелять в ${target.name}?`,
            confirmText: 'Стрелять',
            onConfirm: () => {
              this.resolveHumanAction({ type: 'shoot', targetId });
              resolve();
            },
            onCancel: () => resolve(),
          });
        });
      },
    });
  }

  private async beginRound(): Promise<void> {
    const spin = applyAction(this.state, { type: 'spin-roulette' });
    this.state = spin.state;
    await this.scene.showRouletteSpin(
      spin.events.find((event) => event.type === 'roulette-spun')?.firstPlayerId ??
        this.state.players[this.state.currentPlayerIndex]!.id,
    );

    const load = applyAction(this.state, { type: 'load-chamber' });
    this.state = load.state;
    await this.scene.showReload();
    this.render();
  }

  private async runTurn(): Promise<void> {
    let turnPlayerId = this.state.players[this.state.currentPlayerIndex]!.id;
    let firstCycle = true;

    while (!this.disposed) {
      const currentPlayer = this.state.players[this.state.currentPlayerIndex]!;

      if (currentPlayer.id !== turnPlayerId) {
        return;
      }

      await this.scene.setActivePlayer(currentPlayer.id);
      this.render();

      if (
        this.mode === 'hot-seat' &&
        !currentPlayer.isBot &&
        this.lastPresentedPlayerId !== null &&
        this.lastPresentedPlayerId !== currentPlayer.id &&
        firstCycle
      ) {
        await this.showPassDevice(currentPlayer.name);
      }

      this.lastPresentedPlayerId = currentPlayer.id;

      const action = currentPlayer.isBot
        ? this.getBotAction(currentPlayer)
        : await this.waitForHumanAction();

      const previousState = this.state;
      const result = applyAction(this.state, action);
      this.state = result.state;
      await this.playEvents(previousState, result.events);
      this.render();
      saveMidGame(this.state);

      if (action.type === 'use-item') {
        firstCycle = false;
        continue;
      }

      if (action.type === 'shoot') {
        this.privacy.clearForPlayer(currentPlayer.id);
      }

      if (this.state.phase === 'game-over') {
        await this.handleGameOver();
        return;
      }

      if (this.state.phase === 'between-rounds') {
        return;
      }

      if (this.state.players[this.state.currentPlayerIndex]!.id !== turnPlayerId) {
        return;
      }

      firstCycle = false;
    }
  }

  private async playEvents(previousState: GameState, events: GameEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case 'item-used': {
          await this.scene.showItemUse(event.playerId, event.itemId);

          if (event.itemId === 'magnifier') {
            const nextBullet = this.state.chamber.bullets[0];

            if (nextBullet) {
              this.privacy.setForPlayer(event.playerId, nextBullet);
              const currentPlayer = this.state.players[this.state.currentPlayerIndex]!;
              if (!currentPlayer.isBot && currentPlayer.id === event.playerId) {
                await this.showPrivatePeek(currentPlayer.name, nextBullet);
              }
            }
          }

          break;
        }
        case 'shot-fired':
          await this.scene.showShoot(event.shooterId, event.targetId, event.bullet);
          break;
        case 'lives-changed': {
          const previousPlayer = previousState.players.find((player) => player.id === event.playerId);
          await this.scene.showLifeChange(
            event.playerId,
            event.newLives - (previousPlayer?.lives ?? event.newLives),
          );
          break;
        }
        case 'turn-changed':
          this.privacy.clearForPlayer(event.nextPlayerId);
          break;
        case 'game-over':
          await this.scene.showWinner(event.winnerId);
          break;
        default:
          break;
      }
    }
  }

  private getBotAction(player: Player): Action {
    const view = getPlayerView(this.state, player.id);
    const rng = createRng(this.state.rngState);
    rng.fromState(this.state.rngState);
    return botDecide(view, rng, {
      magnifierUsedThisTurn: this.state.itemsUsedThisTurn.magnifier,
      chocolateUsedThisTurn: this.state.itemsUsedThisTurn.chocolate,
      peekedNextBullet: this.privacy.getForPlayer(player.id) ?? null,
      extraTurnsUsedByMe: this.state.extraTurnsUsedThisChamber[player.id] ?? 0,
    });
  }

  private waitForHumanAction(): Promise<Action> {
    this.awaitingHuman = true;
    return new Promise((resolve) => {
      this.humanResolver = resolve;
    });
  }

  private resolveHumanAction(action: Action): void {
    if (!this.humanResolver) {
      return;
    }

    const resolve = this.humanResolver;
    this.humanResolver = null;
    this.awaitingHuman = false;
    resolve(action);
  }

  private render(): void {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex] ?? null;
    const onShoot =
      currentPlayer && !currentPlayer.isBot
        ? async () => {
            if (!this.awaitingHuman || !this.humanResolver) {
              return;
            }

            const targetId = await this.scene.requestTargetSelection(
              this.state.players
                .filter((player) => !player.eliminated)
                .map((player) => player.id),
            );
            const target = this.state.players.find((player) => player.id === targetId);

            if (!target) {
              return;
            }

            await new Promise<void>((resolve) => {
              showConfirmDialog(this.root, {
                message: `Стрелять в ${target.name}?`,
                confirmText: 'Стрелять',
                onConfirm: () => {
                  this.resolveHumanAction({ type: 'shoot', targetId });
                  resolve();
                },
                onCancel: () => resolve(),
              });
            });
          }
        : undefined;

    this.huds.playerList.update({
      players: this.state.players,
      activePlayerId: currentPlayer?.id ?? null,
    });

    this.huds.bulletCounter.update({
      liveCount: this.state.chamber.liveCount,
      blankCount: this.state.chamber.blankCount,
    });

    this.huds.itemBar.update({
      inventory: currentPlayer?.inventory ?? { chocolate: 0, magnifier: 0 },
      itemsUsed: this.state.itemsUsedThisTurn,
      onUseItem: (itemId) => {
        if (!this.awaitingHuman || !this.humanResolver || currentPlayer?.isBot) {
          return;
        }
        this.resolveHumanAction({ type: 'use-item', itemId });
      },
    });

    this.huds.actionMenu.update({
      canShoot: currentPlayer ? !currentPlayer.isBot : false,
      hint: currentPlayer
        ? `Ходит ${currentPlayer.name}${currentPlayer.isBot ? ' (бот думает...)' : ''}`
        : 'Ожидание',
      onShoot,
    });
  }

  private async showPrivatePeek(playerName: string, bullet: Bullet): Promise<void> {
    await new Promise<void>((resolve) => {
      const screen = mountPrivatePeekScreen(this.root, {
        playerName,
        bullet,
        onDone: () => {
          screen.unmount();
          resolve();
        },
      });
    });
  }

  private async showPassDevice(playerName: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const screen = mountPassDeviceScreen(this.root, {
        playerName,
        onReady: () => {
          screen.unmount();
          resolve();
        },
      });
    });
  }

  private async handleGameOver(): Promise<void> {
    const winnerId = this.state.winnerId;

    if (!winnerId) {
      return;
    }

    this.rewardProfiles(winnerId);
    clearMidGame();

    const winner = this.state.players.find((player) => player.id === winnerId)!;
    const humanWon = this.profileMap.get(winnerId) !== null;

    await new Promise<void>((resolve) => {
      const screen = mountWinnerScreen(this.root, {
        playerName: winner.name,
        rewardText: humanWon ? 'Получил +200 ₽' : 'Бот победил',
        onMenu: () => {
          screen.unmount();
          resolve();
        },
      });
    });

    this.dispose();
    this.onExit();
  }

  private rewardProfiles(winnerId: string): void {
    this.state.players.forEach((player) => {
      const profileId = this.profileMap.get(player.id);

      if (!profileId) {
        return;
      }

      const profile = getProfile(profileId);

      if (!profile) {
        return;
      }

      updateProfile(profileId, {
        currency: profile.currency + (player.id === winnerId ? 200 : 50),
      });
    });
  }
}
