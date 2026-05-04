import type { Bullet } from '../game/types';
import type { MountableHud } from './PassDeviceScreen';

export interface PrivatePeekScreenProps {
  playerName: string;
  bullet: Bullet;
  onDone: () => void;
}

export function mountPrivatePeekScreen(
  parent: HTMLElement,
  initialProps: PrivatePeekScreenProps,
): MountableHud<PrivatePeekScreenProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;background:linear-gradient(180deg,#0b1020 0%,#12192c 100%);display:flex;align-items:center;justify-content:center;padding:24px;z-index:950;';

  const card = document.createElement('button');
  card.type = 'button';
  card.style.cssText =
    'width:min(100%,480px);background:#12182a;border:1px solid #32415f;border-radius:24px;padding:32px;color:inherit;text-align:center;';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:30px;margin-bottom:16px;';

  const body = document.createElement('p');
  body.style.cssText = 'line-height:1.6;color:#d4dcf3;';

  let stage = 0;

  const render = (props: PrivatePeekScreenProps): void => {
    if (stage === 0) {
      title.textContent = `Только для ${props.playerName}`;
      body.textContent = 'Нажми, чтобы посмотреть следующий патрон.';
      return;
    }

    if (stage === 1) {
      const isLive = props.bullet === 'live';
      title.textContent = isLive ? 'Следующий патрон: БОЕВОЙ' : 'Следующий патрон: ХОЛОСТОЙ';
      title.style.color = isLive ? '#ff7b54' : '#88d498';
      body.textContent = 'Запомни результат и нажми ещё раз, чтобы спрятать его.';
      return;
    }

    title.style.color = '#f3f5ff';
    title.textContent = 'Спрячь результат';
    body.textContent = 'Передай устройство обратно и продолжай ход.';
  };

  card.onclick = () => {
    stage += 1;
    if (stage > 2) {
      initialProps.onDone();
      return;
    }
    render(initialProps);
  };

  card.append(title, body);
  root.appendChild(card);
  parent.appendChild(root);

  const update = (props: PrivatePeekScreenProps): void => {
    initialProps = props;
    stage = 0;
    title.style.color = '#f3f5ff';
    render(props);
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
