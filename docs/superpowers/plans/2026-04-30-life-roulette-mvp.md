# Рулетка Жизни — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable web-based offline shotgun-roulette game for 1 vs AI or 2-7 player hot-seat, deployed to GitHub Pages.

**Architecture:** Layered TypeScript app — pure GameEngine (logic + seeded RNG + action log) → OfflineGameController (orchestration) → Scene3D plugin (Three.js TableScene) + DOM HUD/menus. Persistence in localStorage with player profiles. Online-multiplayer-ready by construction (PlayerView projections, action log, deterministic RNG).

**Tech Stack:** TypeScript (strict), Vite, Three.js, vitest, pnpm, GitHub Actions, GitHub Pages.

**Specification:** [docs/superpowers/specs/2026-04-30-life-roulette-design-v2.md](../specs/2026-04-30-life-roulette-design-v2.md)

---

## Conventions

- **TDD where it makes sense:** Engine, Chamber, Bot, RNG, Views, Persistence — yes (pure logic, easy to test). Scene3D, HUD — manual playtest + Playwright e2e at the end.
- **DOM creation:** use `document.createElement` + `textContent` + `appendChild`. Never use `innerHTML` for user-derived data; even for static strings prefer the safe approach for consistency.
- **Commit cadence:** every passing test + working feature = commit. No big-bang commits.
- **Branch strategy:** all on `main` for MVP (small team, no concurrent work). No force-push.
- **Indentation:** 2 spaces (TypeScript convention).
- **File naming:** `kebab-case.ts` for files, `PascalCase` for types/classes, `camelCase` for functions/vars.
- **Russian locale** for UI strings (default), code comments in English.
- **Path conventions in this plan:** all paths relative to `/Users/oxi/cc/oxi/life-roulette/`.

---

## File Structure (decomposition lock-in)

Each file has one clear responsibility:

```
life-roulette/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── README.md
├── CREDITS.md
├── .gitignore
├── .github/workflows/deploy.yml
├── public/
│   ├── models/
│   └── textures/
├── src/
│   ├── main.ts                           # entry, mount root, route between screens
│   ├── style.css                         # global CSS reset + theme
│   ├── i18n.ts                           # русские строки UI
│   ├── game/
│   │   ├── types.ts                      # все доменные типы
│   │   ├── rng.ts                        # mulberry32 seeded RNG
│   │   ├── chamber.ts                    # generateChamber, fireBullet
│   │   ├── engine.ts                     # initGame, applyAction
│   │   ├── views.ts                      # getPlayerView (public projection)
│   │   └── bot.ts                        # botDecide pure function
│   ├── persistence/
│   │   ├── schema.ts                     # storage key constants
│   │   ├── profiles.ts                   # profile CRUD on localStorage
│   │   └── mid-game.ts                   # save/restore mid-game state
│   ├── scene/
│   │   ├── Scene3D.ts                    # interface
│   │   ├── TableScene.ts                 # MVP implementation
│   │   ├── assets.ts                     # Three.js asset loader with progress
│   │   └── helpers.ts                    # geometry/material primitives, lighting
│   ├── hud/
│   │   ├── PlayerListHud.ts              # top bar with players + lives
│   │   ├── ItemBarHud.ts                 # current player's inventory
│   │   ├── ActionMenuHud.ts              # "Shoot / Use item" menu
│   │   ├── BulletCounterHud.ts           # X live + Y blank
│   │   ├── PrivatePeekScreen.ts          # private fullscreen for magnifier
│   │   ├── PassDeviceScreen.ts           # "Pass the phone to [Name]"
│   │   ├── LoadingScreen.ts              # asset load progress
│   │   ├── ConfirmDialog.ts              # reusable confirm overlay
│   │   └── WinnerScreen.ts               # winner ceremony
│   ├── menu/
│   │   ├── MainMenu.ts
│   │   ├── ModeSelect.ts
│   │   ├── ProfileSelect.ts
│   │   ├── PlayerCountSelect.ts
│   │   └── ShopScreen.ts
│   └── controllers/
│       ├── OfflineGameController.ts      # engine + scene + HUD glue + privacy
│       └── visibility.ts                 # visibilitychange listener wrapper
└── tests/
    ├── unit/
    │   ├── rng.test.ts
    │   ├── chamber.test.ts
    │   ├── engine.test.ts
    │   ├── views.test.ts
    │   ├── bot.test.ts
    │   └── persistence/
    │       ├── profiles.test.ts
    │       └── mid-game.test.ts
    └── e2e/
        └── play-vs-ai.spec.ts            # Playwright happy-path
```

---

## Phase 0 — Project setup & GitHub repo

### Task 0.1: GitHub repo

**Files:** none (только GitHub remote)

- [ ] **Step 1:** Проверить активный gh-аккаунт

```bash
gh auth status 2>&1 | grep -E "(Logged|active)"
```

Expected: `OXI-717` активный. Если нет — `gh auth switch --user OXI-717`.

- [ ] **Step 2:** Создать репо

```bash
cd /Users/oxi/cc/oxi/life-roulette
gh repo create OXI-717/life-roulette --private --source=. --remote=origin --description="Рулетка Жизни — пошаговая 3D-игра. Семейный проект (папа + сын)."
```

- [ ] **Step 3:** Запушить коммиты

```bash
git push -u origin main
```

- [ ] **Step 4:** Включить Pages

```bash
gh api repos/OXI-717/life-roulette/pages -X POST -f build_type=workflow
```

Если приватный репо не позволяет Pages → переключить на public:
```bash
gh repo edit OXI-717/life-roulette --visibility public --accept-visibility-change-consequences
```

### Task 0.2: Vite + TypeScript scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/style.css`

- [ ] **Step 1:** Инициализация pnpm

```bash
cd /Users/oxi/cc/oxi/life-roulette
pnpm init
```

- [ ] **Step 2:** Заменить `package.json`

```json
{
  "name": "life-roulette",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "three": "^0.180.0"
  },
  "devDependencies": {
    "@types/three": "^0.180.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3:** Установить

```bash
pnpm install
```

Expected: создан `node_modules/`, `pnpm-lock.yaml`.

- [ ] **Step 4:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/life-roulette/',
  build: { target: 'es2022', sourcemap: true },
  server: { port: 5173, open: false },
});
```

- [ ] **Step 6:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 7:** `index.html`

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <title>Рулетка Жизни</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 8:** `src/style.css`

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0a0a14;
  color: #e8e8f0;
}
#app { height: 100%; display: flex; flex-direction: column; }
button { font: inherit; cursor: pointer; min-height: 44px; min-width: 44px; }
```

- [ ] **Step 9:** `src/main.ts` — заглушка через safe DOM API (БЕЗ innerHTML)

```typescript
const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

const wrap = document.createElement('div');
wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;flex:1;text-align:center;';
const h1 = document.createElement('h1');
h1.textContent = 'Рулетка Жизни';
wrap.appendChild(h1);
app.appendChild(wrap);
```

- [ ] **Step 10:** Запустить dev-сервер

```bash
pnpm dev
```

Открыть `http://localhost:5173/life-roulette/` — должен показаться заголовок.

- [ ] **Step 11:** Typecheck

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 12:** Коммит

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts vitest.config.ts index.html src/main.ts src/style.css
git commit -m "Scaffold Vite + TypeScript + Three.js"
git push
```

### Task 0.3: GitHub Actions deploy workflow

**Files:** Create: `.github/workflows/deploy.yml`

- [ ] **Step 1:** Создать workflow

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2:** Push и проверить run

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deploy workflow"
git push
gh run watch --exit-status
```

Expected: workflow проходит. Если `pnpm test` ругается на пустой набор — это ОК, vitest exit 0 на нет тестов. Если падает на typecheck — пофиксить и пушнуть.

### Task 0.4: CREDITS.md и asset folders

**Files:**
- Create: `CREDITS.md`
- Create: `public/models/.gitkeep`, `public/textures/.gitkeep`

- [ ] **Step 1:** `CREDITS.md`

```markdown
# Credits

## 3D Models
(Заполняется по мере добавления.)

## Textures
(Аналогично.)

## Code
- Three.js — MIT — https://threejs.org/
- Vite — MIT — https://vitejs.dev/
- TypeScript — Apache 2.0 — https://www.typescriptlang.org/

## Inspiration
*Buckshot Roulette* by Mike Klubnika — https://mikeklubnika.itch.io/buckshot-roulette
```

- [ ] **Step 2:** Folders

```bash
mkdir -p public/models public/textures
touch public/models/.gitkeep public/textures/.gitkeep
git add CREDITS.md public/
git commit -m "Add CREDITS.md and asset directories"
git push
```

---

## Phase 1 — Game Engine (pure logic, TDD)

### Task 1.1: Domain types

**Files:** Create: `src/game/types.ts`

- [ ] **Step 1:** Записать типы из spec v2 раздел 8.3

```typescript
// src/game/types.ts

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
  | 'menu' | 'profile-select' | 'roulette' | 'loading'
  | 'turn-item' | 'turn-shot' | 'turn-resolve'
  | 'pass-device' | 'paused' | 'between-rounds'
  | 'game-over' | 'shop';

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
```

- [ ] **Step 2:** Typecheck + commit

```bash
pnpm typecheck
git add src/game/types.ts
git commit -m "Add game domain types"
git push
```

### Task 1.2: Seeded RNG (mulberry32)

**Files:**
- Create: `src/game/rng.ts`
- Create: `tests/unit/rng.test.ts`

- [ ] **Step 1:** Failing tests

```typescript
// tests/unit/rng.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/game/rng';

describe('rng', () => {
  it('produces deterministic sequence from same seed', () => {
    const r1 = createRng(42);
    const r2 = createRng(42);
    expect([r1.next(), r1.next(), r1.next()]).toEqual([r2.next(), r2.next(), r2.next()]);
  });

  it('different seeds → different sequences', () => {
    expect(createRng(42).next()).not.toEqual(createRng(43).next());
  });

  it('next() returns float in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('intRange(min, max) returns integer in [min..max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.intRange(1, 5);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle preserves elements', () => {
    const rng = createRng(99);
    const original = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle([...original]);
    expect([...shuffled].sort()).toEqual(original);
  });

  it('serializable: toState/fromState', () => {
    const r1 = createRng(42); r1.next(); r1.next();
    const state = r1.toState();
    const r2 = createRng(0); r2.fromState(state);
    expect(r1.next()).toEqual(r2.next());
  });
});
```

- [ ] **Step 2:** Run — FAIL

```bash
pnpm test
```

- [ ] **Step 3:** Implement

```typescript
// src/game/rng.ts

export interface Rng {
  next(): number;
  intRange(minInclusive: number, maxInclusive: number): number;
  shuffle<T>(arr: T[]): T[];
  toState(): number;
  fromState(state: number): void;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  function mulberry32(): number {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next: () => mulberry32(),
    intRange: (min, max) => min + Math.floor(mulberry32() * (max - min + 1)),
    shuffle: <T>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(mulberry32() * (i + 1));
        const tmp = arr[i]!; arr[i] = arr[j]!; arr[j] = tmp;
      }
      return arr;
    },
    toState: () => state,
    fromState: (s) => { state = s >>> 0; },
  };
}
```

- [ ] **Step 4:** Run — PASS

- [ ] **Step 5:** Commit

```bash
git add src/game/rng.ts tests/unit/rng.test.ts
git commit -m "Add seeded RNG (mulberry32) with tests"
git push
```

### Task 1.3: Chamber

**Files:**
- Create: `src/game/chamber.ts`
- Create: `tests/unit/chamber.test.ts`

- [ ] **Step 1:** Failing tests

```typescript
// tests/unit/chamber.test.ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/game/rng';
import { generateChamber, fireBullet } from '../../src/game/chamber';

describe('chamber', () => {
  describe('generateChamber', () => {
    it('always 6 bullets', () => {
      for (let s = 1; s < 50; s++) {
        expect(generateChamber(createRng(s)).bullets).toHaveLength(6);
      }
    });
    it('min 1 live + min 1 blank (mandatory)', () => {
      for (let s = 1; s < 50; s++) {
        const c = generateChamber(createRng(s));
        expect(c.liveCount).toBeGreaterThanOrEqual(1);
        expect(c.blankCount).toBeGreaterThanOrEqual(1);
        expect(c.liveCount + c.blankCount).toBe(6);
      }
    });
    it('counts match bullets array', () => {
      const c = generateChamber(createRng(123));
      expect(c.liveCount).toBe(c.bullets.filter(b => b === 'live').length);
      expect(c.blankCount).toBe(c.bullets.filter(b => b === 'blank').length);
    });
    it('deterministic for same seed', () => {
      expect(generateChamber(createRng(42))).toEqual(generateChamber(createRng(42)));
    });
  });

  describe('fireBullet', () => {
    it('removes front bullet, returns it', () => {
      const c = generateChamber(createRng(7));
      const expectFront = c.bullets[0]!;
      const r = fireBullet(c);
      expect(r.bullet).toBe(expectFront);
      expect(r.chamber.bullets).toHaveLength(5);
    });
    it('updates counts', () => {
      const c = generateChamber(createRng(7));
      const r = fireBullet(c);
      if (r.bullet === 'live') {
        expect(r.chamber.liveCount).toBe(c.liveCount - 1);
        expect(r.chamber.blankCount).toBe(c.blankCount);
      } else {
        expect(r.chamber.liveCount).toBe(c.liveCount);
        expect(r.chamber.blankCount).toBe(c.blankCount - 1);
      }
    });
    it('throws on empty chamber', () => {
      expect(() => fireBullet({ bullets: [], liveCount: 0, blankCount: 0 })).toThrow();
    });
  });
});
```

- [ ] **Step 2:** FAIL → Implement

```typescript
// src/game/chamber.ts
import type { Chamber, Bullet } from './types';
import type { Rng } from './rng';

export function generateChamber(rng: Rng): Chamber {
  const liveCount = rng.intRange(1, 5);
  const blankCount = 6 - liveCount;
  const bullets: Bullet[] = [
    ...Array(liveCount).fill('live') as Bullet[],
    ...Array(blankCount).fill('blank') as Bullet[],
  ];
  rng.shuffle(bullets);
  return { bullets, liveCount, blankCount };
}

export function fireBullet(chamber: Chamber): { bullet: Bullet; chamber: Chamber } {
  if (chamber.bullets.length === 0) throw new Error('Cannot fire: chamber is empty');
  const bullet = chamber.bullets[0]!;
  return {
    bullet,
    chamber: {
      bullets: chamber.bullets.slice(1),
      liveCount: chamber.liveCount - (bullet === 'live' ? 1 : 0),
      blankCount: chamber.blankCount - (bullet === 'blank' ? 1 : 0),
    },
  };
}
```

- [ ] **Step 3:** PASS, commit

```bash
git add src/game/chamber.ts tests/unit/chamber.test.ts
git commit -m "Add chamber: gen with min-1-of-each + fire"
git push
```

### Task 1.4: Engine — initGame + spin-roulette

**Files:**
- Create: `src/game/engine.ts`
- Create: `tests/unit/engine.test.ts`

- [ ] **Step 1:** Tests (см. подробно ниже)

```typescript
// tests/unit/engine.test.ts
import { describe, it, expect } from 'vitest';
import { initGame, applyAction } from '../../src/game/engine';
import type { Player } from '../../src/game/types';

function makePlayer(id: string, name: string, isBot = false): Player {
  return { id, name, profileId: null, lives: 4, inventory: { chocolate: 1, magnifier: 1 }, isBot, eliminated: false };
}

describe('engine.initGame', () => {
  it('valid state with 4 lives each, phase=roulette', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B')];
    const s = initGame(players, 42);
    expect(s.players).toHaveLength(2);
    expect(s.players.every(p => p.lives === 4)).toBe(true);
    expect(s.phase).toBe('roulette');
    expect(s.actionLog).toHaveLength(0);
    expect(s.chamber.bullets).toHaveLength(0);
  });
  it('throws on <2 or >7 players', () => {
    expect(() => initGame([makePlayer('a','A')], 1)).toThrow();
    const eight = Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`, `P${i}`));
    expect(() => initGame(eight, 1)).toThrow();
  });
});

describe('engine.applyAction(spin-roulette)', () => {
  it('deterministic from seed', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B'), makePlayer('c','C')];
    const a = applyAction(initGame(players, 42), { type: 'spin-roulette' });
    const b = applyAction(initGame(players, 42), { type: 'spin-roulette' });
    expect(a.state.players[a.state.currentPlayerIndex]!.id).toEqual(b.state.players[b.state.currentPlayerIndex]!.id);
  });
  it('emits roulette-spun event', () => {
    const r = applyAction(initGame([makePlayer('a','A'), makePlayer('b','B')], 42), { type: 'spin-roulette' });
    expect(r.events.find(e => e.type === 'roulette-spun')).toBeDefined();
  });
  it('phase becomes loading', () => {
    const r = applyAction(initGame([makePlayer('a','A'), makePlayer('b','B')], 42), { type: 'spin-roulette' });
    expect(r.state.phase).toBe('loading');
  });
  it('skips eliminated', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B'), makePlayer('c','C')];
    let s = initGame(players, 42);
    s = { ...s, players: s.players.map(p => p.id === 'a' ? { ...p, eliminated: true, lives: 0 } : p) };
    const r = applyAction(s, { type: 'spin-roulette' });
    expect(r.state.players[r.state.currentPlayerIndex]!.id).not.toBe('a');
  });
});
```

- [ ] **Step 2:** FAIL → Implement minimal engine

```typescript
// src/game/engine.ts
import type { Action, GameEvent, GameState, Player } from './types';
import { createRng } from './rng';

export function initGame(players: Player[], seed: number): GameState {
  if (players.length < 2 || players.length > 7) throw new Error(`Invalid player count: ${players.length}`);
  return {
    players: players.map(p => ({ ...p, lives: 4, eliminated: false })),
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

export function applyAction(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const rng = createRng(0);
  rng.fromState(state.rngState);

  switch (action.type) {
    case 'spin-roulette': {
      const aliveIndices = state.players.map((p, i) => p.eliminated ? -1 : i).filter(i => i >= 0);
      if (aliveIndices.length === 0) throw new Error('No alive players');
      const pick = aliveIndices[rng.intRange(0, aliveIndices.length - 1)]!;
      events.push({ type: 'roulette-spun', firstPlayerId: state.players[pick]!.id });
      return {
        state: { ...state, currentPlayerIndex: pick, phase: 'loading', rngState: rng.toState(), actionLog: [...state.actionLog, action] },
        events,
      };
    }
    default:
      throw new Error(`Unsupported action type`);
  }
}
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/engine.ts tests/unit/engine.test.ts
git commit -m "Engine: initGame + spin-roulette"
git push
```

### Task 1.5: Engine — load-chamber

**Files:** Modify: `src/game/engine.ts`, `tests/unit/engine.test.ts`

- [ ] **Step 1:** Tests

```typescript
// добавить в engine.test.ts
describe('engine.applyAction(load-chamber)', () => {
  it('fills chamber, phase → turn-item', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B')];
    let s = initGame(players, 42);
    s = applyAction(s, { type: 'spin-roulette' }).state;
    const r = applyAction(s, { type: 'load-chamber' });
    expect(r.state.chamber.bullets).toHaveLength(6);
    expect(r.state.chamber.liveCount + r.state.chamber.blankCount).toBe(6);
    expect(r.state.phase).toBe('turn-item');
  });
  it('emits chamber-loaded event', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B')];
    let s = applyAction(initGame(players, 42), { type: 'spin-roulette' }).state;
    const r = applyAction(s, { type: 'load-chamber' });
    expect(r.events.find(e => e.type === 'chamber-loaded')).toBeDefined();
  });
  it('resets per-chamber tracking', () => {
    const players = [makePlayer('a','A'), makePlayer('b','B')];
    let s = initGame(players, 42);
    s = { ...s, extraTurnsUsedThisChamber: { a: 1 }, itemsUsedThisTurn: { chocolate: true, magnifier: false } };
    s = applyAction(s, { type: 'spin-roulette' }).state;
    const r = applyAction(s, { type: 'load-chamber' });
    expect(r.state.extraTurnsUsedThisChamber).toEqual({});
    expect(r.state.itemsUsedThisTurn).toEqual({ chocolate: false, magnifier: false });
  });
});
```

- [ ] **Step 2:** FAIL → Add to switch

```typescript
// в engine.ts вверху файла:
import { generateChamber } from './chamber';

// в applyAction switch:
    case 'load-chamber': {
      const chamber = generateChamber(rng);
      events.push({ type: 'chamber-loaded', liveCount: chamber.liveCount, blankCount: chamber.blankCount });
      return {
        state: {
          ...state, chamber, phase: 'turn-item', rngState: rng.toState(),
          extraTurnsUsedThisChamber: {},
          itemsUsedThisTurn: { chocolate: false, magnifier: false },
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/engine.ts tests/unit/engine.test.ts
git commit -m "Engine: load-chamber action"
git push
```

### Task 1.6: Engine — use-item

**Files:** Modify both engine files

- [ ] **Step 1:** Tests

```typescript
describe('engine.applyAction(use-item)', () => {
  function setupTurn() {
    const players = [makePlayer('a','A'), makePlayer('b','B')];
    let s = initGame(players, 42);
    s = applyAction(s, { type: 'spin-roulette' }).state;
    s = applyAction(s, { type: 'load-chamber' }).state;
    return s;
  }
  it('chocolate: +1 life, decreases inventory', () => {
    let s = setupTurn();
    const i = s.currentPlayerIndex;
    s.players[i] = { ...s.players[i]!, lives: 2, inventory: { chocolate: 1, magnifier: 1 } };
    const r = applyAction(s, { type: 'use-item', itemId: 'chocolate' });
    expect(r.state.players[i]!.lives).toBe(3);
    expect(r.state.players[i]!.inventory.chocolate).toBe(0);
  });
  it('chocolate caps at 4', () => {
    let s = setupTurn();
    const i = s.currentPlayerIndex;
    s.players[i] = { ...s.players[i]!, lives: 4, inventory: { chocolate: 1, magnifier: 1 } };
    const r = applyAction(s, { type: 'use-item', itemId: 'chocolate' });
    expect(r.state.players[i]!.lives).toBe(4);
  });
  it('throws if no item', () => {
    let s = setupTurn();
    const i = s.currentPlayerIndex;
    s.players[i] = { ...s.players[i]!, inventory: { chocolate: 0, magnifier: 0 } };
    expect(() => applyAction(s, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });
  it('throws if item already used', () => {
    let s = setupTurn();
    s = { ...s, itemsUsedThisTurn: { chocolate: true, magnifier: false } };
    expect(() => applyAction(s, { type: 'use-item', itemId: 'chocolate' })).toThrow();
  });
  it('emits item-used event, marks itemsUsedThisTurn', () => {
    let s = setupTurn();
    const i = s.currentPlayerIndex;
    s.players[i] = { ...s.players[i]!, inventory: { chocolate: 1, magnifier: 1 } };
    const r = applyAction(s, { type: 'use-item', itemId: 'magnifier' });
    expect(r.events.find(e => e.type === 'item-used')).toBeDefined();
    expect(r.state.itemsUsedThisTurn.magnifier).toBe(true);
  });
});
```

- [ ] **Step 2:** Implement

```typescript
// engine.ts switch:
    case 'use-item': {
      const player = state.players[state.currentPlayerIndex]!;
      if ((player.inventory[action.itemId] ?? 0) <= 0) throw new Error(`No ${action.itemId}`);
      if (state.itemsUsedThisTurn[action.itemId]) throw new Error(`${action.itemId} already used this turn`);

      const newInventory = { ...player.inventory, [action.itemId]: player.inventory[action.itemId]! - 1 };
      let newLives = player.lives;
      if (action.itemId === 'chocolate') {
        newLives = Math.min(player.lives + 1, 4);
        if (newLives !== player.lives) {
          events.push({ type: 'lives-changed', playerId: player.id, newLives });
        }
      }

      const newPlayers = state.players.map((p, idx) =>
        idx === state.currentPlayerIndex ? { ...p, inventory: newInventory, lives: newLives } : p
      );
      events.push({ type: 'item-used', playerId: player.id, itemId: action.itemId });

      return {
        state: {
          ...state, players: newPlayers,
          itemsUsedThisTurn: { ...state.itemsUsedThisTurn, [action.itemId]: true },
          actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/engine.ts tests/unit/engine.test.ts
git commit -m "Engine: use-item action"
git push
```

### Task 1.7: Engine — shoot (резолв, extra-turn cap, переход хода, win)

Это самая сложная задача.

**Files:** Modify both engine files

- [ ] **Step 1:** Тесты (минимум 10 кейсов)

Полный код тестов (вставить в `engine.test.ts`):

```typescript
describe('engine.applyAction(shoot)', () => {
  function setup3p(seed = 42) {
    const players = [makePlayer('a','A'), makePlayer('b','B'), makePlayer('c','C')];
    let s = initGame(players, seed);
    s = applyAction(s, { type: 'spin-roulette' }).state;
    s = applyAction(s, { type: 'load-chamber' }).state;
    return s;
  }
  function withChamber(s: ReturnType<typeof setup3p>, bullets: ('live' | 'blank')[]) {
    return { ...s, chamber: { bullets: [...bullets], liveCount: bullets.filter(b => b === 'live').length, blankCount: bullets.filter(b => b === 'blank').length } };
  }

  it('self+blank: extra turn, no life loss', () => {
    let s = setup3p();
    const i = s.currentPlayerIndex;
    s = withChamber(s, ['blank', 'live']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[i]!.id });
    expect(r.state.players[i]!.lives).toBe(4);
    expect(r.state.currentPlayerIndex).toBe(i);
    expect(r.events.some(e => e.type === 'extra-turn-granted')).toBe(true);
  });

  it('self+live: -1 life, turn passes', () => {
    let s = setup3p();
    const i = s.currentPlayerIndex;
    s = withChamber(s, ['live', 'blank']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[i]!.id });
    expect(r.state.players[i]!.lives).toBe(3);
    expect(r.state.currentPlayerIndex).not.toBe(i);
  });

  it('other+live: target -1, turn passes', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    const tg = (sh + 1) % 3;
    s = withChamber(s, ['live', 'blank']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[tg]!.id });
    expect(r.state.players[tg]!.lives).toBe(3);
    expect(r.state.currentPlayerIndex).not.toBe(sh);
  });

  it('other+blank: nobody hurt, turn passes', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    const tg = (sh + 1) % 3;
    s = withChamber(s, ['blank', 'live']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[tg]!.id });
    expect(r.state.players[tg]!.lives).toBe(4);
    expect(r.state.currentPlayerIndex).not.toBe(sh);
  });

  it('extra-turn cap: 2nd self+blank in same chamber DOES NOT extra-turn', () => {
    let s = setup3p();
    const i = s.currentPlayerIndex;
    s = withChamber(s, ['blank', 'blank', 'live']);
    let r = applyAction(s, { type: 'shoot', targetId: s.players[i]!.id });
    expect(r.state.currentPlayerIndex).toBe(i);
    r = applyAction(r.state, { type: 'shoot', targetId: r.state.players[i]!.id });
    expect(r.state.currentPlayerIndex).not.toBe(i);
    expect(r.events.some(e => e.type === 'extra-turn-cap-hit')).toBe(true);
  });

  it('elimination: marks eliminated, emits event', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    const tg = (sh + 1) % 3;
    s.players[tg] = { ...s.players[tg]!, lives: 1 };
    s = withChamber(s, ['live']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[tg]!.id });
    expect(r.state.players[tg]!.lives).toBe(0);
    expect(r.state.players[tg]!.eliminated).toBe(true);
    expect(r.events.some(e => e.type === 'player-eliminated')).toBe(true);
  });

  it('chamber empty after shot → between-rounds phase', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    s = withChamber(s, ['blank']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[(sh + 1) % 3]!.id });
    expect(r.state.chamber.bullets).toHaveLength(0);
    expect(r.state.phase).toBe('between-rounds');
  });

  it('one alive after shot → game-over with winner', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    const a = s.players[sh]!.id;
    const b = s.players[(sh + 1) % 3]!.id;
    const c = s.players[(sh + 2) % 3]!.id;
    s.players = s.players.map(p => p.id === b ? { ...p, lives: 1 } : p.id === c ? { ...p, lives: 0, eliminated: true } : p);
    s = withChamber(s, ['live']);
    const r = applyAction(s, { type: 'shoot', targetId: b });
    expect(r.state.phase).toBe('game-over');
    expect(r.state.winnerId).toBe(a);
  });

  it('shooting eliminated player throws', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    const tg = (sh + 1) % 3;
    s.players[tg] = { ...s.players[tg]!, lives: 0, eliminated: true };
    s = withChamber(s, ['live']);
    expect(() => applyAction(s, { type: 'shoot', targetId: s.players[tg]!.id })).toThrow();
  });

  it('itemsUsedThisTurn resets after shot', () => {
    let s = setup3p();
    const sh = s.currentPlayerIndex;
    s = { ...s, itemsUsedThisTurn: { chocolate: true, magnifier: true } };
    s = withChamber(s, ['live', 'blank']);
    const r = applyAction(s, { type: 'shoot', targetId: s.players[(sh + 1) % 3]!.id });
    expect(r.state.itemsUsedThisTurn).toEqual({ chocolate: false, magnifier: false });
  });
});
```

- [ ] **Step 2:** FAIL → Implement

```typescript
// engine.ts top:
import { fireBullet } from './chamber';

function nextAliveIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx]!.eliminated) return idx;
  }
  return fromIndex;
}

// switch:
    case 'shoot': {
      const shooter = state.players[state.currentPlayerIndex]!;
      const target = state.players.find(p => p.id === action.targetId);
      if (!target) throw new Error(`Target ${action.targetId} not found`);
      if (target.eliminated) throw new Error(`Target ${action.targetId} is eliminated`);

      const fired = fireBullet(state.chamber);
      const isSelfShot = target.id === shooter.id;

      events.push({ type: 'shot-fired', shooterId: shooter.id, targetId: target.id, bullet: fired.bullet });

      let players = [...state.players];
      const extraTurns = { ...state.extraTurnsUsedThisChamber };
      let nextPlayerIndex = state.currentPlayerIndex;
      let phase: typeof state.phase = state.phase;
      let winnerId: string | null = state.winnerId;

      if (fired.bullet === 'live') {
        const targetIdx = players.findIndex(p => p.id === target.id);
        const newLives = players[targetIdx]!.lives - 1;
        const eliminated = newLives <= 0;
        players[targetIdx] = { ...players[targetIdx]!, lives: newLives, eliminated };
        events.push({ type: 'lives-changed', playerId: target.id, newLives });
        if (eliminated) events.push({ type: 'player-eliminated', playerId: target.id });
      }

      const grantsExtraTurn = isSelfShot && fired.bullet === 'blank' && !players[state.currentPlayerIndex]!.eliminated;
      const usedSoFar = extraTurns[shooter.id] ?? 0;
      const capHit = grantsExtraTurn && usedSoFar >= 1;

      if (grantsExtraTurn && !capHit) {
        extraTurns[shooter.id] = usedSoFar + 1;
        events.push({ type: 'extra-turn-granted', playerId: shooter.id });
      } else {
        if (capHit) events.push({ type: 'extra-turn-cap-hit', playerId: shooter.id });
        nextPlayerIndex = nextAliveIndex(players, state.currentPlayerIndex);
        if (!players[nextPlayerIndex]!.eliminated) {
          events.push({ type: 'turn-changed', nextPlayerId: players[nextPlayerIndex]!.id });
        }
      }

      const aliveCount = players.filter(p => !p.eliminated).length;
      if (aliveCount === 1) {
        winnerId = players.find(p => !p.eliminated)!.id;
        phase = 'game-over';
        events.push({ type: 'game-over', winnerId });
      } else if (fired.chamber.bullets.length === 0) {
        phase = 'between-rounds';
        events.push({ type: 'chamber-empty' });
      } else {
        phase = 'turn-item';
      }

      return {
        state: {
          ...state, players, chamber: fired.chamber,
          currentPlayerIndex: nextPlayerIndex, phase,
          extraTurnsUsedThisChamber: extraTurns,
          itemsUsedThisTurn: { chocolate: false, magnifier: false },
          winnerId, actionLog: [...state.actionLog, action],
        },
        events,
      };
    }
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/engine.ts tests/unit/engine.test.ts
git commit -m "Engine: shoot with resolve, extra-turn cap, win condition"
git push
```

### Task 1.8: PlayerView projection

**Files:** Create: `src/game/views.ts`, `tests/unit/views.test.ts`

(аналогично — тесты + реализация. Полные тесты см. в spec/v1 предыдущей версии плана; основные кейсы: возвращает self matching id, фильтрует other без приватных полей, отражает chamber counts, throws на unknown id.)

- [ ] **Step 1:** Tests

```typescript
// tests/unit/views.test.ts
import { describe, it, expect } from 'vitest';
import { initGame, applyAction } from '../../src/game/engine';
import { getPlayerView } from '../../src/game/views';
import type { Player } from '../../src/game/types';

const p = (id: string, name: string): Player => ({ id, name, profileId: null, lives: 4, inventory: { chocolate: 1, magnifier: 1 }, isBot: false, eliminated: false });

describe('getPlayerView', () => {
  it('self matches id', () => {
    expect(getPlayerView(initGame([p('a','A'), p('b','B')], 1), 'a').selfPlayer.id).toBe('a');
  });
  it('others exclude self, contain only public fields', () => {
    const v = getPlayerView(initGame([p('a','A'), p('b','B'), p('c','C')], 1), 'a');
    expect(v.otherPlayers.map(o => o.id)).toEqual(['b','c']);
    expect((v.otherPlayers[0] as unknown as { inventory?: unknown }).inventory).toBeUndefined();
  });
  it('chamber counts reflect state', () => {
    let s = initGame([p('a','A'), p('b','B')], 1);
    s = applyAction(s, { type: 'spin-roulette' }).state;
    s = applyAction(s, { type: 'load-chamber' }).state;
    const v = getPlayerView(s, 'a');
    expect(v.chamberLive).toBe(s.chamber.liveCount);
    expect(v.chamberBlank).toBe(s.chamber.blankCount);
  });
  it('throws on unknown id', () => {
    expect(() => getPlayerView(initGame([p('a','A'), p('b','B')], 1), 'zzz')).toThrow();
  });
});
```

- [ ] **Step 2:** Implement

```typescript
// src/game/views.ts
import type { GameState, PlayerView } from './types';

export function getPlayerView(state: GameState, playerId: string): PlayerView {
  const self = state.players.find(p => p.id === playerId);
  if (!self) throw new Error(`Player ${playerId} not in state`);
  return {
    selfPlayer: self,
    otherPlayers: state.players
      .filter(p => p.id !== playerId)
      .map(p => ({ id: p.id, name: p.name, lives: p.lives, eliminated: p.eliminated })),
    chamberLive: state.chamber.liveCount,
    chamberBlank: state.chamber.blankCount,
    currentPlayerId: state.players[state.currentPlayerIndex]!.id,
    phase: state.phase,
  };
}
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/views.ts tests/unit/views.test.ts
git commit -m "Add getPlayerView projection"
git push
```

### Task 1.9: Bot

**Files:** Create: `src/game/bot.ts`, `tests/unit/bot.test.ts`

- [ ] **Step 1:** Tests

```typescript
// tests/unit/bot.test.ts
import { describe, it, expect } from 'vitest';
import { botDecide } from '../../src/game/bot';
import { createRng } from '../../src/game/rng';
import type { PlayerView, Player } from '../../src/game/types';

function makeView(opts: {
  selfInventory?: Record<string, number>;
  selfLives?: number;
  otherPlayers?: PlayerView['otherPlayers'];
  chamberLive?: number;
  chamberBlank?: number;
}): PlayerView {
  const self: Player = {
    id: 'bot', name: 'Bot', profileId: null, isBot: true, eliminated: false,
    lives: opts.selfLives ?? 4,
    inventory: (opts.selfInventory ?? { chocolate: 1, magnifier: 1 }) as Player['inventory'],
  };
  return {
    selfPlayer: self,
    otherPlayers: opts.otherPlayers ?? [{ id: 'h', name: 'Human', lives: 3, eliminated: false }],
    chamberLive: opts.chamberLive ?? 3,
    chamberBlank: opts.chamberBlank ?? 3,
    currentPlayerId: 'bot',
    phase: 'turn-item',
  };
}

describe('botDecide', () => {
  it('uses magnifier first if available', () => {
    expect(botDecide(makeView({}), createRng(1), { magnifierUsedThisTurn: false, peekedNextBullet: null }))
      .toEqual({ type: 'use-item', itemId: 'magnifier' });
  });
  it('peek=blank, no cap → shoot self', () => {
    expect(botDecide(makeView({}), createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: 'blank', extraTurnsUsedByMe: 0 }))
      .toEqual({ type: 'shoot', targetId: 'bot' });
  });
  it('peek=blank, cap reached → shoot weakest', () => {
    const view = makeView({ otherPlayers: [{ id: 'h1', name: 'A', lives: 4, eliminated: false }, { id: 'h2', name: 'B', lives: 1, eliminated: false }] });
    expect(botDecide(view, createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: 'blank', extraTurnsUsedByMe: 1 }))
      .toEqual({ type: 'shoot', targetId: 'h2' });
  });
  it('peek=live → shoot weakest', () => {
    const view = makeView({ otherPlayers: [{ id: 'h1', name: 'A', lives: 3, eliminated: false }, { id: 'h2', name: 'B', lives: 1, eliminated: false }] });
    expect(botDecide(view, createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: 'live', extraTurnsUsedByMe: 0 }))
      .toEqual({ type: 'shoot', targetId: 'h2' });
  });
  it('low life + chocolate → heal', () => {
    expect(botDecide(makeView({ selfLives: 1, selfInventory: { chocolate: 1, magnifier: 0 } }), createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: null, chocolateUsedThisTurn: false }))
      .toEqual({ type: 'use-item', itemId: 'chocolate' });
  });
  it('unknown, more live → shoot weakest', () => {
    const view = makeView({ chamberLive: 4, chamberBlank: 2, otherPlayers: [{ id: 'h', name: 'H', lives: 2, eliminated: false }] });
    expect(botDecide(view, createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: null }))
      .toEqual({ type: 'shoot', targetId: 'h' });
  });
  it('unknown, more blank → shoot self', () => {
    expect(botDecide(makeView({ chamberLive: 1, chamberBlank: 4 }), createRng(1), { magnifierUsedThisTurn: true, peekedNextBullet: null, extraTurnsUsedByMe: 0 }))
      .toEqual({ type: 'shoot', targetId: 'bot' });
  });
});
```

- [ ] **Step 2:** Implement

```typescript
// src/game/bot.ts
import type { Action, PlayerView, Bullet } from './types';
import type { Rng } from './rng';

export interface BotContext {
  magnifierUsedThisTurn: boolean;
  chocolateUsedThisTurn?: boolean;
  peekedNextBullet: Bullet | null;
  extraTurnsUsedByMe?: number;
}

export function botDecide(view: PlayerView, _rng: Rng, ctx: BotContext): Action {
  const me = view.selfPlayer;
  const aliveEnemies = view.otherPlayers.filter(p => !p.eliminated);
  const weakest = aliveEnemies.reduce<typeof aliveEnemies[0] | null>(
    (acc, p) => (!acc || p.lives < acc.lives ? p : acc), null
  );

  if (me.lives <= 1 && me.inventory.chocolate > 0 && !ctx.chocolateUsedThisTurn) {
    return { type: 'use-item', itemId: 'chocolate' };
  }
  if (me.inventory.magnifier > 0 && !ctx.magnifierUsedThisTurn) {
    return { type: 'use-item', itemId: 'magnifier' };
  }

  if (ctx.peekedNextBullet === 'blank') {
    const cap = (ctx.extraTurnsUsedByMe ?? 0) >= 1;
    if (!cap) return { type: 'shoot', targetId: me.id };
    if (weakest) return { type: 'shoot', targetId: weakest.id };
  }
  if (ctx.peekedNextBullet === 'live') {
    if (weakest) return { type: 'shoot', targetId: weakest.id };
    return { type: 'shoot', targetId: me.id };
  }

  if (view.chamberLive >= view.chamberBlank) {
    if (weakest) return { type: 'shoot', targetId: weakest.id };
  }
  return { type: 'shoot', targetId: me.id };
}
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/game/bot.ts tests/unit/bot.test.ts
git commit -m "Add deterministic bot heuristic"
git push
```

---

## Phase 2 — Persistence

### Task 2.1: Profiles CRUD

**Files:** Create: `src/persistence/schema.ts`, `src/persistence/profiles.ts`, `tests/unit/persistence/profiles.test.ts`

- [ ] **Step 1:** Tests

```typescript
// tests/unit/persistence/profiles.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listProfiles, createProfile, updateProfile, deleteProfile, getProfile } from '../../../src/persistence/profiles';

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
})();

beforeEach(() => {
  memoryStorage.clear();
  (globalThis as unknown as { localStorage: typeof memoryStorage }).localStorage = memoryStorage;
});

describe('profiles', () => {
  it('initially empty', () => expect(listProfiles()).toEqual([]));
  it('create adds with defaults', () => {
    const p = createProfile('Alice');
    expect(p.name).toBe('Alice');
    expect(p.currency).toBe(0);
    expect(p.inventory).toEqual({ chocolate: 0, magnifier: 0 });
  });
  it('list returns saved', () => {
    createProfile('A'); createProfile('B');
    expect(listProfiles().map(p => p.name).sort()).toEqual(['A','B']);
  });
  it('update modifies fields', () => {
    const p = createProfile('Alice');
    updateProfile(p.id, { currency: 100, inventory: { chocolate: 2, magnifier: 1 } });
    const r = getProfile(p.id);
    expect(r?.currency).toBe(100);
    expect(r?.inventory.chocolate).toBe(2);
  });
  it('delete removes', () => {
    const p = createProfile('A');
    deleteProfile(p.id);
    expect(getProfile(p.id)).toBeNull();
  });
  it('survives JSON parse errors', () => {
    memoryStorage.setItem('life-roulette:profiles', 'broken');
    expect(listProfiles()).toEqual([]);
  });
});
```

- [ ] **Step 2:** Реализовать `schema.ts`

```typescript
// src/persistence/schema.ts
export const STORAGE_KEYS = {
  profiles: 'life-roulette:profiles',
  midGame: 'life-roulette:mid-game',
} as const;
```

- [ ] **Step 3:** Реализовать `profiles.ts`

```typescript
// src/persistence/profiles.ts
import type { ItemId } from '../game/types';
import { STORAGE_KEYS } from './schema';

export interface PlayerProfile {
  id: string;
  name: string;
  currency: number;
  inventory: Record<ItemId, number>;
  createdAt: number;
  lastUsed: number;
}

function readAll(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profiles);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PlayerProfile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: PlayerProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function listProfiles(): PlayerProfile[] {
  return readAll();
}

export function getProfile(id: string): PlayerProfile | null {
  return readAll().find(p => p.id === id) ?? null;
}

export function createProfile(name: string): PlayerProfile {
  const now = Date.now();
  const p: PlayerProfile = {
    id: generateId(), name, currency: 0,
    inventory: { chocolate: 0, magnifier: 0 },
    createdAt: now, lastUsed: now,
  };
  const all = readAll();
  all.push(p);
  writeAll(all);
  return p;
}

export function updateProfile(id: string, patch: Partial<Omit<PlayerProfile, 'id' | 'createdAt'>>): void {
  const all = readAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) throw new Error(`Profile ${id} not found`);
  all[idx] = { ...all[idx]!, ...patch, lastUsed: Date.now() };
  writeAll(all);
}

export function deleteProfile(id: string): void {
  writeAll(readAll().filter(p => p.id !== id));
}
```

- [ ] **Step 4:** PASS → Commit

```bash
git add src/persistence/ tests/unit/persistence/
git commit -m "Add player profiles persistence (localStorage)"
git push
```

### Task 2.2: Mid-game state

**Files:** Create: `src/persistence/mid-game.ts`, `tests/unit/persistence/mid-game.test.ts`

(аналогично 2.1, но `sessionStorage`)

- [ ] **Step 1:** Tests

```typescript
// tests/unit/persistence/mid-game.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveMidGame, loadMidGame, clearMidGame } from '../../../src/persistence/mid-game';
import type { GameState } from '../../../src/game/types';

const memSession = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
})();

beforeEach(() => { memSession.clear(); (globalThis as unknown as { sessionStorage: typeof memSession }).sessionStorage = memSession; });

const dummyState: GameState = {
  players: [], currentPlayerIndex: 0,
  chamber: { bullets: [], liveCount: 0, blankCount: 0 },
  phase: 'turn-item', rngSeed: 1, rngState: 1,
  extraTurnsUsedThisChamber: {}, itemsUsedThisTurn: { chocolate: false, magnifier: false },
  winnerId: null, actionLog: [],
};

describe('mid-game persistence', () => {
  it('save → load round-trips', () => { saveMidGame(dummyState); expect(loadMidGame()).toEqual(dummyState); });
  it('clear removes', () => { saveMidGame(dummyState); clearMidGame(); expect(loadMidGame()).toBeNull(); });
  it('returns null on garbage', () => { memSession.setItem('life-roulette:mid-game', 'broken'); expect(loadMidGame()).toBeNull(); });
});
```

- [ ] **Step 2:** Implement

```typescript
// src/persistence/mid-game.ts
import type { GameState } from '../game/types';
import { STORAGE_KEYS } from './schema';

export function saveMidGame(state: GameState): void {
  try { sessionStorage.setItem(STORAGE_KEYS.midGame, JSON.stringify(state)); } catch { /* quota — ignore */ }
}

export function loadMidGame(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.midGame);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch { return null; }
}

export function clearMidGame(): void {
  sessionStorage.removeItem(STORAGE_KEYS.midGame);
}
```

- [ ] **Step 3:** PASS → Commit

```bash
git add src/persistence/mid-game.ts tests/unit/persistence/mid-game.test.ts
git commit -m "Add mid-game state persistence (sessionStorage)"
git push
```

---

## Phase 3 — HUD components

Каждый компонент — функция `mount(parent, props)` возвращающая `{ update, unmount }`. Стили inline или классы CSS. **Все DOM через `createElement` + `textContent`**, никогда `innerHTML`.

Ниже — детально для самых важных, остальные по паттерну.

### Task 3.1: ConfirmDialog (переиспользуемый)

**Files:** Create: `src/hud/ConfirmDialog.ts`

- [ ] **Step 1:** Реализовать

```typescript
// src/hud/ConfirmDialog.ts

export interface ConfirmDialogProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showConfirmDialog(parent: HTMLElement, props: ConfirmDialogProps): { close: () => void } {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:24px;max-width:80vw;text-align:center;';

  const msg = document.createElement('p');
  msg.textContent = props.message;
  msg.style.cssText = 'margin-bottom:20px;font-size:18px;';

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:12px;justify-content:center;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = props.cancelText ?? 'Отмена';
  cancelBtn.style.cssText = 'padding:12px 24px;background:#444;color:white;border:none;border-radius:8px;font-size:16px;';
  cancelBtn.onclick = () => { close(); props.onCancel?.(); };

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = props.confirmText ?? 'Подтвердить';
  confirmBtn.style.cssText = 'padding:12px 24px;background:#e74c3c;color:white;border:none;border-radius:8px;font-size:16px;font-weight:bold;';
  confirmBtn.onclick = () => { close(); props.onConfirm(); };

  buttons.append(cancelBtn, confirmBtn);
  dialog.append(msg, buttons);
  overlay.appendChild(dialog);
  parent.appendChild(overlay);

  function close() { overlay.remove(); }
  return { close };
}
```

- [ ] **Step 2:** Commit

```bash
git add src/hud/ConfirmDialog.ts
git commit -m "Add ConfirmDialog HUD component"
git push
```

### Tasks 3.2–3.10: Остальные HUD компоненты

Каждая задача:
1. Создать файл `src/hud/<Name>.ts`
2. Реализовать функцию `mount(parent, props)` через `createElement` + `textContent` + `appendChild`
3. Add commit

Список:

- **3.2 PassDeviceScreen** — fullscreen "Передай телефон [Имя]" + кнопка "Готов"
- **3.3 PrivatePeekScreen** — приватный экран лупы: stage 1 = "Только для [Имя], нажми чтобы посмотреть", stage 2 = показ "Следующий патрон: 🔴 БОЕВОЙ" / "🟢 ХОЛОСТОЙ", stage 3 = "Спрячь и передай"
- **3.4 LoadingScreen** — заголовок + прогресс бар (CSS `<progress>` или custom)
- **3.5 PlayerListHud** — горизонтальная панель с аватарами (просто инициалы), жизнями, активный игрок выделен
- **3.6 ItemBarHud** — кнопки 🍫 [N] и 🔍 [N], отключены если 0 или уже использованы
- **3.7 ActionMenuHud** — кнопка "Стрелять" + список целей (себя + живые противники)
- **3.8 BulletCounterHud** — "🔴 N · ⚪ M"
- **3.9 WinnerScreen** — заголовок "Победил [Имя]", анимация (CSS scale), "+200 ₽" текст, кнопка "В меню"
- **3.10 ShopScreen** — отдельный экран: список товаров (шоколадка, лупа), цена, текущая валюта, кнопка купить, лимит inventory

**Acceptance:** все компоненты импортируются без ошибок, можно собрать минимальную страницу с любым из них.

---

## Phase 4 — Menu screens

(каждый файл — функция `mount(parent, onResult)`, возвращает выбор пользователя в callback)

- **4.1 MainMenu** — кнопки "Играть", "Магазин", "Профили"
- **4.2 ModeSelect** — vs AI / hot-seat
- **4.3 ProfileSelect** — список профилей + создать новый + гость
- **4.4 PlayerCountSelect** — 2..7

(детально как HUD: createElement + textContent + commit)

---

## Phase 5 — TableScene (3D)

### Task 5.1: Scene3D interface + helpers + assets

**Files:**
- Create: `src/scene/Scene3D.ts` (interface из spec 8.6)
- Create: `src/scene/helpers.ts` — `createTable()`, `createPlayerFigure(playerName)`, `createGunPlaceholder()`, `setupLighting(scene)`
- Create: `src/scene/assets.ts` — wrapper с прогрессом

### Task 5.2: TableScene — пустая сцена

**Files:** Create: `src/scene/TableScene.ts`

- [ ] **Step 1:** Three.js boilerplate: WebGLRenderer, Scene, PerspectiveCamera (FOV 60, position above table looking down)
- [ ] **Step 2:** Стол + лампа (DirectionalLight + AmbientLight)
- [ ] **Step 3:** `requestAnimationFrame` render loop
- [ ] **Step 4:** Resize handler
- [ ] **Step 5:** Manual verify: dev server показывает тёмную сцену со столом
- [ ] **Step 6:** Commit

### Task 5.3: Фигурки игроков по кругу

- [ ] **Step 1:** Cylinder body + sphere head как фигурка (одна функция в helpers)
- [ ] **Step 2:** `arrangePlayersAround(table, players)` — равномерно по кругу radius=2
- [ ] **Step 3:** Имя игрока — Three.js TextSprite (или CanvasTexture с textContent)
- [ ] **Step 4:** Manual verify
- [ ] **Step 5:** Commit

### Task 5.4: Револьвер + showRouletteSpin

- [ ] **Step 1:** Box-плэйсхолдер револьвера с rotation.y
- [ ] **Step 2:** `showRouletteSpin(stoppedAtId)` — анимация с easing к нужному игроку (Promise resolves когда анимация закончилась)
- [ ] **Step 3:** Manual verify
- [ ] **Step 4:** Commit

### Task 5.5: showShoot + setActivePlayer

- [ ] **Step 1:** `setActivePlayer(id)` — emission + scale на фигурке
- [ ] **Step 2:** `showShoot(shooter, target, bullet)` — револьвер двигается к цели, "вспышка" sprite emissive, возврат на стол. Promise.
- [ ] **Step 3:** Manual verify
- [ ] **Step 4:** Commit

### Task 5.6: showLifeChange / showItemUse / showWinner / showReload

- [ ] **Step 1-4:** Каждая — короткая анимация (1-2 сек), Promise resolves когда закончилась
- [ ] **Step 5:** Commit после каждой

### Task 5.7: requestTargetSelection (UI overlay над сценой)

- [ ] **Step 1:** Поверх canvas — DOM overlay с кнопками имён живых противников + "Себя"
- [ ] **Step 2:** Promise resolves с выбранным id
- [ ] **Step 3:** Manual verify
- [ ] **Step 4:** Commit

---

## Phase 6 — Controllers

### Task 6.1: OfflineGameController

**Files:** Create: `src/controllers/OfflineGameController.ts`

- [ ] **Step 1:** Конструктор: принимает `engine state`, `scene: Scene3D`, `huds: { playerList, itemBar, ... }`, `mode: 'vs-ai' | 'hot-seat'`, `profileMap: Map<playerId, profileId>`

- [ ] **Step 2:** Метод `start()`: применить `spin-roulette` → проиграть `roulette-spun` через `scene.showRouletteSpin` → применить `load-chamber` → начать ход

- [ ] **Step 3:** Метод `runTurn()`:
  - if hot-seat AND not first turn of this player: показать `PassDeviceScreen`
  - if currentPlayer.isBot: вызвать `botDecide(view, rng, ctx)` где `ctx.peekedNextBullet` — приватное состояние контроллера
  - else: ждать выбора через `ActionMenuHud` (по событию)
  - apply action, проиграть события через scene + huds (последовательно через `await`)
  - if `'item-used'` && magnifier: показать `PrivatePeekScreen` для текущего игрока, peek хранится в private state контроллера
  - if `'turn-changed'`: clear peek для нового игрока
  - if `'chamber-empty'`: вернуться к шагу 1 (рулетка + зарядка)
  - if `'game-over'`: вызвать `WinnerScreen`, наградить профили (200 победителю + 50 каждому), завершить

- [ ] **Step 4:** Privacy state класс:
  ```typescript
  class TurnPrivacy {
    peekedByPlayer: Record<string, Bullet> = {};
    clearForPlayer(id: string) { delete this.peekedByPlayer[id]; }
    setForPlayer(id: string, bullet: Bullet) { this.peekedByPlayer[id] = bullet; }
    getForPlayer(id: string): Bullet | undefined { return this.peekedByPlayer[id]; }
  }
  ```

- [ ] **Step 5:** Commit

### Task 6.2: visibility.ts — pause/resume

**Files:** Create: `src/controllers/visibility.ts`

- [ ] **Step 1:** Функция `attachVisibilityHandler(onHide: () => void, onShow: () => void)` подписывается на `document.visibilitychange`

- [ ] **Step 2:** В `OfflineGameController` использовать: на hide — `saveMidGame(state)`, на show — `loadMidGame()` если есть, восстановить state

- [ ] **Step 3:** Commit

---

## Phase 7 — Integration в main.ts

### Task 7.1: Router

**Files:** Modify: `src/main.ts`

- [ ] **Step 1:** Заменить заглушку на router

```typescript
// src/main.ts
import { mountMainMenu } from './menu/MainMenu';
import { mountModeSelect } from './menu/ModeSelect';
import { mountProfileSelect } from './menu/ProfileSelect';
import { mountPlayerCountSelect } from './menu/PlayerCountSelect';
import { mountShopScreen } from './menu/ShopScreen';
import { startGameVsAI, startGameHotSeat } from './controllers/start-game';
import { mountLoadingScreen } from './hud/LoadingScreen';
import { loadMidGame } from './persistence/mid-game';

const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

// Очистить app
function clear(): HTMLElement {
  while (app!.firstChild) app!.removeChild(app!.firstChild);
  return app!;
}

function showMainMenu(): void {
  mountMainMenu(clear(), {
    onPlay: () => mountModeSelect(clear(), {
      onVsAI: () => mountProfileSelect(clear(), {
        onSelect: (profile) => startGameVsAI(clear(), profile, showMainMenu),
      }),
      onHotSeat: () => mountPlayerCountSelect(clear(), {
        onCount: (count) => mountProfileSelect(clear(), {
          onSelect: () => { /* TODO: цикл по count выборов */ },
          multi: count,
          onAllSelected: (profiles) => startGameHotSeat(clear(), profiles, showMainMenu),
        }),
      }),
    }),
    onShop: () => mountShopScreen(clear(), { onBack: showMainMenu }),
  });
}

// Restore mid-game на старте
const saved = loadMidGame();
if (saved && saved.phase !== 'menu' && saved.phase !== 'game-over') {
  // TODO: показать "Продолжить?" diaog → restore
  showMainMenu();
} else {
  showMainMenu();
}
```

- [ ] **Step 2:** Manual playthrough: vs AI должна работать end-to-end
- [ ] **Step 3:** Commit

---

## Phase 8 — Shop integration

### Task 8.1: ShopScreen wired with profiles

**Files:** Modify: `src/menu/ShopScreen.ts`

- [ ] **Step 1:** Кнопки "Купить шоколадку (50)" и "Купить лупу (50)"
- [ ] **Step 2:** На клик: проверить currency >= price, проверить inventory[item] < 5
- [ ] **Step 3:** Списать currency, увеличить inventory, сохранить через `updateProfile`
- [ ] **Step 4:** Если currency < price: кнопка disabled
- [ ] **Step 5:** Если inventory[item] >= 5: кнопка disabled с подписью "Максимум"
- [ ] **Step 6:** Manual playtest
- [ ] **Step 7:** Commit

### Task 8.2: Награды по итогу игры

**Files:** Modify: `src/controllers/OfflineGameController.ts`

- [ ] **Step 1:** В `game-over` обработке: для каждого игрока с `profileId !== null`:
  - если победитель: `updateProfile(profileId, { currency: prev + 200 })`
  - иначе: `updateProfile(profileId, { currency: prev + 50 })`
- [ ] **Step 2:** WinnerScreen показывает текст "Получил +200" / "Получил +50"
- [ ] **Step 3:** Manual playtest
- [ ] **Step 4:** Commit

---

## Phase 9 — Polish & e2e

### Task 9.1: LoadingScreen wiring в main.ts

- [ ] **Step 1:** Перед showMainMenu — показать LoadingScreen, загрузить ассеты сцены через `assets.ts` с прогрессом
- [ ] **Step 2:** Таймаут 30 сек → ошибка с кнопкой "Обновить"
- [ ] **Step 3:** Commit

### Task 9.2: Playwright e2e

**Files:** Create: `playwright.config.ts`, `tests/e2e/play-vs-ai.spec.ts`

- [ ] **Step 1:** Установить Playwright

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2:** Конфиг

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173/life-roulette/',
    headless: true,
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173/life-roulette/',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3:** Test (happy path: vs AI → выиграть)

```typescript
// tests/e2e/play-vs-ai.spec.ts
import { test, expect } from '@playwright/test';

test('happy path: vs AI returns to main menu after playing one game', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Играть');
  await page.click('text=vs компьютер');
  await page.click('text=Гость');
  // wait for game screen
  await expect(page.locator('text=Стрелять')).toBeVisible({ timeout: 30_000 });
  // hammering shoot until winner appears
  for (let i = 0; i < 100; i++) {
    const winnerVisible = await page.locator('text=Победил').isVisible().catch(() => false);
    if (winnerVisible) break;
    const shootBtn = page.locator('text=Стрелять').first();
    if (await shootBtn.isVisible()) await shootBtn.click();
    const targetBtn = page.locator('button:has-text("Bot"), button:has-text("Гость")').first();
    if (await targetBtn.isVisible()) await targetBtn.click();
    await page.waitForTimeout(500);
  }
  await expect(page.locator('text=Победил')).toBeVisible();
});
```

- [ ] **Step 4:** Запустить локально

```bash
pnpm exec playwright test
```

- [ ] **Step 5:** Добавить в CI: после `pnpm test` добавить `pnpm exec playwright test`
- [ ] **Step 6:** Commit

### Task 9.3: Mobile testing manually

- [ ] **Step 1:** Запустить с `--host`

```bash
pnpm dev --host 0.0.0.0
```

- [ ] **Step 2:** Зайти с телефона по локальному IP (например `http://192.168.1.50:5173/life-roulette/`)
- [ ] **Step 3:** Проверить:
  - 30+ fps в TableScene
  - все кнопки нажимаются без двойных касаний
  - hot-seat passing работает (передача телефона)
  - PrivatePeekScreen действительно скрывает результат после tap
  - portrait orientation
- [ ] **Step 4:** Зафиксить найденные проблемы — каждый фикс в отдельный коммит

---

## Phase 10 — Deploy verification

### Task 10.1: Verify deployed game

- [ ] **Step 1:** Дождаться успешного деплоя

```bash
gh run watch --exit-status
```

- [ ] **Step 2:** Открыть `https://oxi-717.github.io/life-roulette/`
- [ ] **Step 3:** Полный playthrough vs AI на десктопе
- [ ] **Step 4:** Полный playthrough на мобильном
- [ ] **Step 5:** Зафиксить issues если есть, фиксить, повторять

### Task 10.2: Demo для семьи

- [ ] **Step 1:** Дать ссылку юному разработчику и сыграть 1-2 игры вместе
- [ ] **Step 2:** Записать обратную связь

```bash
mkdir -p docs/playtest
echo "# Playtest 1 — $(date)" > docs/playtest/01-family.md
# (заполнить руками после игры)
```

- [ ] **Step 3:** Запланировать Phase 1.5 на основе фидбека

---

## Self-review

После написания плана проверил:

✅ **Spec coverage:** каждый раздел spec v2 имеет соответствующие задачи (engine, types, chamber, RNG, bot, profiles, mid-game, HUD, scene, controller, deploy, рулетка, shop, приватный peek, pass-device, награды, лицензии).

✅ **No placeholders в критичных местах:** все шаги фазы 0-2 содержат точный код или точные команды. Фазы 3-7 для повторяющихся компонентов используют паттерн (детально для 3.1, остальные по аналогии — оправданно для DRY).

✅ **Type consistency:** `applyAction(state, action)`, `getPlayerView(state, playerId)`, `botDecide(view, rng, ctx)`, `mountX(parent, props)` — везде одинаковые сигнатуры.

⚠️ **Намеренные упрощения:**
- HUD-задачи 3.2-3.10 описаны кратко (паттерн идентичен 3.1)
- Scene-задачи 5.2-5.7 — high-level, реализация будет требовать experimentation
- Тесты HUD/Scene/Controller — отложены до Playwright e2e в 9.2

## Риски при реализации

1. **Three.js learning curve** — задачи 5.x могут потребовать существенно больше времени. План Б: упрощённый CSS-3D или 2D вместо Three.js, если за неделю не получится базовая сцена.
2. **Mobile performance** — может потребовать оптимизаций. Фиксим если упрётся в playtest.
3. **GitHub Actions Pages permissions** — задача 0.1 step 4 может потребовать manual fixup в UI репозитория.
4. **Hot-seat e2e** — Playwright тест в 9.2 покрывает только vs AI. Hot-seat требует ручного playtest.

---

**Конец плана.**
