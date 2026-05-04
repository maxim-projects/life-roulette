import type { ItemId } from '../game/types';
import type { MountableHud } from './PassDeviceScreen';

export interface ItemBarHudProps {
  inventory: Record<ItemId, number>;
  itemsUsed: Record<ItemId, boolean>;
  onUseItem?: (itemId: ItemId) => void;
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

    const itemConfigs: Array<{ id: ItemId; label: string }> = [
      { id: 'chocolate', label: '🍫 Шоколадка' },
      { id: 'magnifier', label: '🔍 Лупа' },
    ];

    itemConfigs.forEach((config) => {
      const count = props.inventory[config.id] ?? 0;
      const used = props.itemsUsed[config.id];
      const button = document.createElement('button');
      button.textContent = `${config.label} [${count}]`;
      button.disabled = count <= 0 || used;
      button.style.cssText = [
        'padding:12px 16px;border:none;border-radius:14px;background:#202a40;color:#f2f5ff;',
        button.disabled ? 'opacity:0.5;' : 'background:#334663;',
      ].join('');
      button.onclick = () => props.onUseItem?.(config.id);
      root.appendChild(button);
    });
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
