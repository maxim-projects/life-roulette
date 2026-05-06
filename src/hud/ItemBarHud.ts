import type { ItemId, Player } from '../game/types';
import type { MountableHud } from './PassDeviceScreen';

export interface ItemBarHudProps {
  inventory: Record<ItemId, number>;
  itemsUsed: Record<ItemId, boolean>;
  player?: Player | null;
  onUseItem?: (itemId: ItemId) => void;
  onKnifeArm?: () => void;
  onSuperArm?: () => void;
  onLightningRequest?: () => void;
}

export function mountItemBarHud(
  parent: HTMLElement,
  initialProps: ItemBarHudProps,
): MountableHud<ItemBarHudProps> {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;padding:0 16px 16px;';
  parent.appendChild(root);

  const update = (props: ItemBarHudProps): void => {
    initialProps = props;
    root.replaceChildren();
    const player = props.player ?? null;
    const inventory = player?.inventory ?? props.inventory;

    const makeItemButton = (label: string, onClick: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.cssText =
        'padding:12px 16px;border:none;border-radius:14px;background:#334663;color:#f2f5ff;';
      button.onclick = onClick;
      return button;
    };

    const itemConfigs: Array<{ id: ItemId; label: string }> = [
      { id: 'chocolate', label: '🍫 Шоколадка' },
      { id: 'magnifier', label: '🔍 Лупа' },
    ];

    itemConfigs.forEach((config) => {
      const count = inventory[config.id] ?? 0;
      const used = props.itemsUsed[config.id];
      const button = makeItemButton(`${config.label} [${count}]`, () => props.onUseItem?.(config.id));
      button.disabled = count <= 0 || used;
      button.style.cssText = [
        'padding:12px 16px;border:none;border-radius:14px;color:#f2f5ff;',
        button.disabled ? 'opacity:0.5;' : 'background:#334663;',
      ].join('');
      root.appendChild(button);
    });

    if (
      player?.classId === 'double' &&
      player.inventory.knife > 0 &&
      !player.classState.knifeArmed
    ) {
      root.appendChild(makeItemButton('🔪 Взвести нож', () => props.onKnifeArm?.()));
    }

    if (player?.classId === 'double' && player.classState.knifeArmed) {
      const indicator = document.createElement('span');
      indicator.textContent = '🔪 ВЗВЕДЁН';
      indicator.style.cssText =
        'display:flex;align-items:center;padding:12px 16px;border-radius:14px;background:#2b1d1d;color:#ff7b7b;font-weight:700;';
      root.appendChild(indicator);
    }

    // Super-патрон: доступен любому игроку
    if (player && (player.inventory.super ?? 0) > 0 && !player.classState.superArmed) {
      const count = player.inventory.super;
      root.appendChild(
        makeItemButton(`🎯 Взвести Супер [${count}]`, () => props.onSuperArm?.()),
      );
    }

    if (player?.classState.superArmed) {
      const indicator = document.createElement('span');
      indicator.textContent = '🎯 СУПЕР ВЗВЕДЁН';
      indicator.style.cssText =
        'display:flex;align-items:center;padding:12px 16px;border-radius:14px;background:#3a2a14;color:#ffb84d;font-weight:700;';
      root.appendChild(indicator);
    }

    if (player?.classId === 'god') {
      const used = player.classState.lightningTotalUsed;
      const usedThisChamber = player.classState.lightningUsedThisChamber;
      const button = makeItemButton(`⚡ Молния (${4 - used}/4)`, () => {
        props.onLightningRequest?.();
      });

      if (used >= 4 || usedThisChamber) {
        button.disabled = true;
        button.style.opacity = '0.5';
      }

      root.appendChild(button);
    }
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
