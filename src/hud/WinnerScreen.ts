import type { MountableHud } from './PassDeviceScreen';

export interface WinnerScreenProps {
  playerName: string;
  rewardText?: string;
  onMenu: () => void;
}

export function mountWinnerScreen(
  parent: HTMLElement,
  initialProps: WinnerScreenProps,
): MountableHud<WinnerScreenProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;background:radial-gradient(circle at top, #334864 0%, #0b1018 75%);display:flex;align-items:center;justify-content:center;padding:24px;z-index:980;';

  const card = document.createElement('div');
  card.style.cssText =
    'width:min(100%,520px);background:rgba(9,14,24,0.88);border:1px solid #42577c;border-radius:28px;padding:36px;text-align:center;animation:winner-pop 450ms ease;';

  const trophy = document.createElement('div');
  trophy.textContent = '🏆';
  trophy.style.cssText = 'font-size:72px;margin-bottom:16px;';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:34px;margin-bottom:12px;';

  const reward = document.createElement('p');
  reward.style.cssText = 'color:#ffd970;font-size:20px;margin-bottom:24px;';

  const button = document.createElement('button');
  button.textContent = 'В меню';
  button.style.cssText =
    'padding:14px 22px;border:none;border-radius:14px;background:#d4552d;color:white;font-size:18px;font-weight:700;';

  card.append(trophy, title, reward, button);
  root.appendChild(card);
  parent.appendChild(root);

  const update = (props: WinnerScreenProps): void => {
    initialProps = props;
    title.textContent = `Победил ${props.playerName}`;
    reward.textContent = props.rewardText ?? '+200 ₽';
    button.onclick = () => props.onMenu();
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
