import { startGameHotSeat, startGameVsAI } from './controllers/start-game';
import { mountMainMenu } from './menu/MainMenu';
import { mountModeSelect } from './menu/ModeSelect';
import { mountPlayerCountSelect } from './menu/PlayerCountSelect';
import { mountProfileSelect } from './menu/ProfileSelect';
import { mountShopScreen } from './menu/ShopScreen';
import { loadMidGame } from './persistence/mid-game';

const app = document.getElementById('app');

if (!app) {
  throw new Error('#app not found');
}

const root = app;

function clear(): HTMLElement {
  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  return root;
}

function showProfiles(): void {
  mountProfileSelect(clear(), {
    onSelect: () => showMainMenu(),
    onBack: showMainMenu,
  });
}

function showMainMenu(): void {
  mountMainMenu(clear(), {
    onPlay: () =>
      mountModeSelect(clear(), {
        onVsAI: () =>
          mountProfileSelect(clear(), {
            onSelect: (profile) => {
              void startGameVsAI(clear(), profile, showMainMenu);
            },
            onBack: showMainMenu,
          }),
        onHotSeat: () =>
          mountPlayerCountSelect(clear(), {
            onCount: (count) =>
              mountProfileSelect(clear(), {
                multi: count,
                onAllSelected: (profiles) => {
                  void startGameHotSeat(clear(), profiles, showMainMenu);
                },
                onBack: showMainMenu,
              }),
            onBack: showMainMenu,
          }),
        onBack: showMainMenu,
      }),
    onShop: () =>
      mountShopScreen(clear(), {
        onBack: showMainMenu,
      }),
    onProfiles: showProfiles,
  });
}

const saved = loadMidGame();

if (saved && saved.phase !== 'menu' && saved.phase !== 'game-over') {
  showMainMenu();
} else {
  showMainMenu();
}
