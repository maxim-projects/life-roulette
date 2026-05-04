import { defaultClassState, ALL_CLASS_IDS } from '../game/classes';
import { initGame } from '../game/engine';
import { createRng } from '../game/rng';
import type { ClassId, Player } from '../game/types';
import { mountActionMenuHud } from '../hud/ActionMenuHud';
import { mountBulletCounterHud } from '../hud/BulletCounterHud';
import { mountItemBarHud } from '../hud/ItemBarHud';
import { mountLoadingScreen } from '../hud/LoadingScreen';
import { mountPlayerListHud } from '../hud/PlayerListHud';
import { mountClassSelectScreen } from '../menu/ClassSelectScreen';
import type { SelectedProfile } from '../menu/ProfileSelect';
import { loadSceneAssets } from '../scene/assets';
import { TableScene } from '../scene/TableScene';
import { OfflineGameController } from './OfflineGameController';

function createGameShell(root: HTMLElement): {
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  bottom: HTMLElement;
} {
  root.style.cssText =
    'display:grid;grid-template-rows:auto 1fr auto;min-height:100%;background:linear-gradient(180deg,#0d1320 0%,#0a0d14 100%);';

  const top = document.createElement('div');
  const middle = document.createElement('div');
  const bottom = document.createElement('div');
  const canvas = document.createElement('canvas');

  middle.style.cssText = 'position:relative;min-height:52vh;padding:0 16px 16px;';
  canvas.style.cssText = 'width:100%;height:100%;border-radius:24px;border:1px solid #263149;background:#0c1017;';
  middle.appendChild(canvas);

  root.append(top, middle, bottom);

  return { canvas, top, bottom };
}

async function selectClassForProfile(
  parent: HTMLElement,
  profile: SelectedProfile,
): Promise<ClassId | null> {
  return new Promise((resolve) => {
    const screen = mountClassSelectScreen(parent, {
      playerName: profile.name,
      ownedClasses: profile.ownedClasses,
      onSelected: (classId) => {
        screen.unmount();
        resolve(classId);
      },
    });
  });
}

function randomBotClass(): ClassId | null {
  const rng = createRng(Date.now());

  if (rng.next() < 0.5) {
    return null;
  }

  return ALL_CLASS_IDS[rng.intRange(0, ALL_CLASS_IDS.length - 1)] ?? null;
}

function createHumanPlayer(id: string, selection: SelectedProfile, classId: ClassId | null): Player {
  return {
    id,
    name: selection.name,
    profileId: selection.profileId,
    lives: 4,
    inventory: {
      chocolate: 1 + selection.inventory.chocolate,
      magnifier: 1 + selection.inventory.magnifier,
      knife: 0,
    },
    isBot: false,
    eliminated: false,
    classId,
    classState: defaultClassState(),
  };
}

function createBotPlayer(classId: ClassId | null): Player {
  return {
    id: 'bot',
    name: 'Bot',
    profileId: null,
    lives: 4,
    inventory: { chocolate: 1, magnifier: 1, knife: 0 },
    isBot: true,
    eliminated: false,
    classId,
    classState: defaultClassState(),
  };
}

async function startGame(
  root: HTMLElement,
  players: Player[],
  mode: 'vs-ai' | 'hot-seat',
  profileMap: Map<string, string | null>,
  onExit: () => void,
): Promise<void> {
  root.replaceChildren();
  const loading = mountLoadingScreen(root, {
    title: 'Подготовка партии',
    progress: 0,
    message: 'Загружаем сцену и интерфейс.',
  });

  await loadSceneAssets((progress) => {
    loading.update({
      title: 'Подготовка партии',
      progress,
      message: `Загружено ${Math.round(progress * 100)}%`,
    });
  });

  loading.unmount();
  root.replaceChildren();

  const shell = createGameShell(root);
  const scene = new TableScene();
  await scene.init(shell.canvas, players);

  const playerList = mountPlayerListHud(shell.top, {
    players,
    activePlayerId: null,
  });
  const bulletCounter = mountBulletCounterHud(shell.bottom, {
    liveCount: 0,
    blankCount: 0,
  });
  const itemBar = mountItemBarHud(shell.bottom, {
    inventory: { chocolate: 0, magnifier: 0, knife: 0 },
    itemsUsed: { chocolate: false, magnifier: false, knife: false },
    player: null,
  });
  const actionMenu = mountActionMenuHud(shell.bottom, {
    canShoot: false,
  });

  const controller = new OfflineGameController({
    root,
    initialState: initGame(players, Date.now()),
    scene,
    huds: { playerList, itemBar, actionMenu, bulletCounter },
    mode,
    profileMap,
    onExit: () => {
      scene.dispose();
      root.replaceChildren();
      onExit();
    },
  });

  await controller.start();
}

export function startGameVsAI(
  root: HTMLElement,
  profile: SelectedProfile,
  onExit: () => void,
): Promise<void> {
  return (async () => {
    const humanClassId = await selectClassForProfile(root, profile);
    const human = createHumanPlayer('human', profile, humanClassId);
    const bot = createBotPlayer(randomBotClass());

    await startGame(
      root,
      [human, bot],
      'vs-ai',
      new Map<string, string | null>([
        [human.id, profile.profileId],
        [bot.id, null],
      ]),
      onExit,
    );
  })();
}

export function startGameHotSeat(
  root: HTMLElement,
  profiles: SelectedProfile[],
  onExit: () => void,
): Promise<void> {
  return (async () => {
    const players: Player[] = [];
    const profileMap = new Map<string, string | null>();

    for (const [index, profile] of profiles.entries()) {
      const classId = await selectClassForProfile(root, profile);
      const player = createHumanPlayer(`player-${index + 1}`, profile, classId);
      players.push(player);
      profileMap.set(player.id, profile.profileId);
    }

    await startGame(root, players, 'hot-seat', profileMap, onExit);
  })();
}
