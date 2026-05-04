import type { MountableHud } from './PassDeviceScreen';

export interface BulletCounterHudProps {
  liveCount: number;
  blankCount: number;
}

export function mountBulletCounterHud(
  parent: HTMLElement,
  initialProps: BulletCounterHudProps,
): MountableHud<BulletCounterHudProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'padding:10px 16px;margin:0 16px 16px;border-radius:14px;background:#161d2f;color:#f2f5ff;display:inline-flex;align-self:flex-start;';
  parent.appendChild(root);

  const update = (props: BulletCounterHudProps): void => {
    initialProps = props;
    root.textContent = `🔴 ${props.liveCount} · ⚪ ${props.blankCount}`;
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
