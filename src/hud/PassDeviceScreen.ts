export interface PassDeviceScreenProps {
  playerName: string;
  onReady: () => void;
}

export interface MountableHud<T> {
  update: (props: T) => void;
  unmount: () => void;
}

export function mountPassDeviceScreen(
  parent: HTMLElement,
  initialProps: PassDeviceScreenProps,
): MountableHud<PassDeviceScreenProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;background:radial-gradient(circle at top, #243151 0%, #0c101a 70%);display:flex;align-items:center;justify-content:center;padding:24px;z-index:900;';

  const card = document.createElement('div');
  card.style.cssText =
    'width:min(100%,480px);background:rgba(12,16,26,0.85);border:1px solid #31415d;border-radius:24px;padding:32px;text-align:center;';

  const label = document.createElement('p');
  label.style.cssText = 'font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:#95a8d6;margin-bottom:12px;';
  label.textContent = 'Hot-seat';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:34px;margin-bottom:12px;';

  const hint = document.createElement('p');
  hint.textContent = 'Передай устройство следующему игроку и нажми, когда он будет готов.';
  hint.style.cssText = 'line-height:1.5;color:#c7d1ec;margin-bottom:24px;';

  const button = document.createElement('button');
  button.textContent = 'Готов';
  button.style.cssText =
    'padding:14px 24px;border:none;border-radius:14px;background:#d4552d;color:white;font-size:18px;font-weight:700;';

  button.onclick = () => initialProps.onReady();

  card.append(label, title, hint, button);
  root.appendChild(card);
  parent.appendChild(root);

  const update = (props: PassDeviceScreenProps): void => {
    initialProps = props;
    title.textContent = `Передай телефон ${props.playerName}`;
    button.onclick = () => props.onReady();
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
