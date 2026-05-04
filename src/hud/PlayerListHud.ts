import type { Player } from '../game/types';
import type { MountableHud } from './PassDeviceScreen';

export interface PlayerListHudProps {
  players: Player[];
  activePlayerId: string | null;
}

export function mountPlayerListHud(
  parent: HTMLElement,
  initialProps: PlayerListHudProps,
): MountableHud<PlayerListHudProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;padding:16px;';
  parent.appendChild(root);

  const update = (props: PlayerListHudProps): void => {
    initialProps = props;
    root.replaceChildren();

    props.players.forEach((player) => {
      const card = document.createElement('div');
      const isActive = player.id === props.activePlayerId;
      card.style.cssText = [
        'padding:12px;border-radius:16px;border:1px solid #2d3c56;background:rgba(14,20,34,0.92);',
        isActive ? 'box-shadow:0 0 0 2px #88d498 inset;transform:translateY(-2px);' : '',
        player.eliminated ? 'opacity:0.45;' : '',
      ].join('');

      const initials = document.createElement('div');
      initials.textContent = player.name.slice(0, 2).toUpperCase();
      initials.style.cssText =
        'width:36px;height:36px;border-radius:50%;background:#25314a;display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:8px;';

      const name = document.createElement('div');
      name.textContent = player.name;
      name.style.cssText = 'font-weight:700;margin-bottom:4px;';

      const lives = document.createElement('div');
      lives.textContent = `Жизни: ${player.lives}`;
      lives.style.cssText = 'color:#bfd0f5;';

      card.append(initials, name, lives);
      root.appendChild(card);
    });
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
