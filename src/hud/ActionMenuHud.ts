import type { MountableHud } from './PassDeviceScreen';

export interface ActionMenuHudProps {
  canShoot: boolean;
  hint?: string;
  onShoot?: () => void;
}

export function mountActionMenuHud(
  parent: HTMLElement,
  initialProps: ActionMenuHudProps,
): MountableHud<ActionMenuHudProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 16px 16px;flex-wrap:wrap;';

  const hint = document.createElement('p');
  hint.style.cssText = 'color:#bfcbea;flex:1;min-width:220px;';

  const shootButton = document.createElement('button');
  shootButton.textContent = 'Стрелять';
  shootButton.style.cssText =
    'padding:14px 18px;border:none;border-radius:14px;background:#d4552d;color:white;font-size:18px;font-weight:700;';

  root.append(hint, shootButton);
  parent.appendChild(root);

  const update = (props: ActionMenuHudProps): void => {
    initialProps = props;
    hint.textContent = props.hint ?? 'Сначала можно использовать предметы, затем обязательно выстрелить.';
    shootButton.disabled = !props.canShoot;
    shootButton.style.opacity = props.canShoot ? '1' : '0.5';
    shootButton.onclick = () => props.onShoot?.();
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
