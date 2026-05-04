import {
  Color,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type MeshStandardMaterial,
} from 'three';
import type { Bullet, ItemId, Player } from '../game/types';
import type { Scene3D } from './Scene3D';
import {
  arrangePlayersAroundCircle,
  createGunPlaceholder,
  createPlayerFigure,
  createTable,
  setupLighting,
  type PlayerFigure,
} from './helpers';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

export class TableScene implements Scene3D {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 100);
  private renderer: WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private overlayRoot: HTMLDivElement | null = null;
  private frameId = 0;
  private paused = false;
  private resizeHandler: (() => void) | null = null;
  private gun = createGunPlaceholder();
  private figures = new Map<string, PlayerFigure>();
  private positions = new Map<string, Vector3>();
  private playerNames = new Map<string, string>();

  async init(canvas: HTMLCanvasElement, players: Player[]): Promise<void> {
    this.canvas = canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.parentElement?.style.setProperty('position', 'relative');

    this.scene.background = new Color('#0c1017');
    this.camera.position.set(0, 4.9, 3.7);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    setupLighting(this.scene);
    this.scene.add(createTable());
    this.scene.add(this.gun);

    const figures = players.map((player) => {
      const figure = createPlayerFigure(player.name);
      this.playerNames.set(player.id, player.name);
      this.figures.set(player.id, figure);
      this.scene.add(figure.group);
      return { id: player.id, figure };
    });

    this.positions = arrangePlayersAroundCircle(figures);

    this.overlayRoot = document.createElement('div');
    this.overlayRoot.style.cssText =
      'position:absolute;inset:0;pointer-events:none;display:flex;align-items:flex-end;justify-content:center;padding:18px;';
    canvas.parentElement?.appendChild(this.overlayRoot);

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.resize();
    this.renderLoop();
  }

  async setActivePlayer(playerId: string): Promise<void> {
    this.figures.forEach((figure, id) => {
      const bodyMaterial = figure.body.material as MeshStandardMaterial;
      const headMaterial = figure.head.material as MeshStandardMaterial;
      const active = id === playerId;
      bodyMaterial.emissive.set(active ? '#66d9a3' : '#000000');
      headMaterial.emissive.set(active ? '#304640' : '#000000');
      figure.group.scale.setScalar(active ? 1.08 : 1);
    });
  }

  async showRouletteSpin(stoppedAtPlayerId: string): Promise<void> {
    const target = this.positions.get(stoppedAtPlayerId);

    if (!target) {
      return;
    }

    const base = Math.atan2(target.x, target.z);
    const from = this.gun.rotation.y;
    const to = from + Math.PI * 4 + base;
    await this.animate(850, (progress) => {
      this.gun.rotation.y = from + (to - from) * easeOutCubic(progress);
    });
  }

  async showShoot(_shooterId: string, targetId: string, bullet: Bullet): Promise<void> {
    const target = this.positions.get(targetId);

    if (!target) {
      return;
    }

    const origin = this.gun.position.clone();
    const destination = target.clone().setY(0.55);

    await this.animate(240, (progress) => {
      this.gun.position.lerpVectors(origin, destination, easeOutCubic(progress));
    });

    const figure = this.figures.get(targetId);
    const bodyMaterial = figure?.body.material as MeshStandardMaterial | undefined;

    if (bodyMaterial) {
      bodyMaterial.emissive.set(bullet === 'live' ? '#f25c54' : '#9bc7ff');
    }

    await wait(180);

    if (bodyMaterial) {
      bodyMaterial.emissive.set('#000000');
    }

    await this.animate(240, (progress) => {
      this.gun.position.lerpVectors(destination, origin, easeOutCubic(progress));
    });
  }

  async showReload(): Promise<void> {
    const origin = this.gun.scale.x;
    await this.animate(240, (progress) => {
      const wave = Math.sin(progress * Math.PI);
      this.gun.scale.setScalar(origin + wave * 0.15);
    });
    this.gun.scale.setScalar(1);
  }

  async showLifeChange(playerId: string, delta: number): Promise<void> {
    const figure = this.figures.get(playerId);

    if (!figure) {
      return;
    }

    const material = figure.head.material as MeshStandardMaterial;
    material.emissive.set(delta < 0 ? '#ff7b54' : '#88d498');
    await wait(220);
    material.emissive.set('#000000');
  }

  async showItemUse(playerId: string, itemId: ItemId): Promise<void> {
    const figure = this.figures.get(playerId);

    if (!figure) {
      return;
    }

    const material = figure.body.material as MeshStandardMaterial;
    material.emissive.set(itemId === 'magnifier' ? '#9bc7ff' : '#ffd166');
    await wait(220);
    material.emissive.set('#000000');
  }

  async showWinner(playerId: string): Promise<void> {
    const figure = this.figures.get(playerId);

    if (!figure) {
      return;
    }

    await this.animate(520, (progress) => {
      const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.12;
      figure.group.scale.setScalar(pulse);
    });
    figure.group.scale.setScalar(1.12);
  }

  requestTargetSelection(eligibleIds: string[]): Promise<string> {
    if (!this.overlayRoot) {
      return Promise.reject(new Error('Scene not initialized'));
    }

    return new Promise((resolve) => {
      const shell = document.createElement('div');
      shell.style.cssText =
        'pointer-events:auto;width:min(100%,540px);display:grid;gap:10px;background:rgba(8,12,18,0.82);padding:16px;border-radius:18px;border:1px solid #31415d;';

      const title = document.createElement('div');
      title.textContent = 'Выбери цель';
      title.style.cssText = 'font-weight:700;text-align:center;';
      shell.appendChild(title);

      const buttons = document.createElement('div');
      buttons.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;';

      eligibleIds.forEach((id) => {
        const button = document.createElement('button');
        button.textContent = this.playerNames.get(id) ?? id;
        button.style.cssText =
          'padding:12px 16px;border:none;border-radius:12px;background:#22314a;color:white;';
        button.onclick = () => {
          shell.remove();
          resolve(id);
        };
        buttons.appendChild(button);
      });

      shell.appendChild(buttons);
      this.overlayRoot?.appendChild(shell);
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (!this.frameId) {
      this.renderLoop();
    }
  }

  dispose(): void {
    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.overlayRoot?.remove();
    this.overlayRoot = null;
    this.renderer?.dispose();
    this.renderer = null;
  }

  private resize(): void {
    if (!this.canvas || !this.renderer) {
      return;
    }

    const width = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
    const height = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private renderLoop = (): void => {
    if (this.paused) {
      this.frameId = 0;
      return;
    }

    this.frameId = window.requestAnimationFrame(this.renderLoop);
    this.renderer?.render(this.scene, this.camera);
  };

  private animate(
    duration: number,
    step: (progress: number) => void,
  ): Promise<void> {
    return new Promise((resolve) => {
      const startedAt = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        step(progress);

        if (progress >= 1) {
          resolve();
          return;
        }

        window.requestAnimationFrame(tick);
      };

      window.requestAnimationFrame(tick);
    });
  }
}
