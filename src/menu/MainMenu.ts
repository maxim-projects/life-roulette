export interface MainMenuProps {
  onPlay: () => void;
  onShop: () => void;
  onProfiles: () => void;
}

export function mountMainMenu(parent: HTMLElement, props: MainMenuProps): { unmount: () => void } {
  const root = document.createElement('div');
  root.className = 'lr-screen';
  root.style.background = 'radial-gradient(circle at top,#20314e 0%,#0a0d14 75%)';

  const panel = document.createElement('div');
  panel.className = 'lr-screen-content';
  panel.style.cssText =
    'max-width:420px;background:rgba(10,13,20,0.82);border:1px solid #31415d;border-radius:28px;padding:32px;';

  const title = document.createElement('h1');
  title.textContent = 'Рулетка Жизни';
  title.style.cssText = 'font-size:38px;margin-bottom:12px;text-align:center;';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Пошаговая 3D-дуэль на одном устройстве или против бота.';
  subtitle.style.cssText = 'text-align:center;line-height:1.6;color:#c5d2f1;margin-bottom:24px;';

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:grid;gap:12px;';

  const actions: Array<{ label: string; onClick: () => void }> = [
    { label: 'Играть', onClick: props.onPlay },
    { label: 'Магазин', onClick: props.onShop },
    { label: 'Профили', onClick: props.onProfiles },
  ];

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.style.cssText =
      'padding:16px 18px;border:none;border-radius:16px;background:#22314a;color:white;font-size:18px;font-weight:700;';
    button.onclick = action.onClick;
    buttons.appendChild(button);
  });

  panel.append(title, subtitle, buttons);
  root.appendChild(panel);
  parent.appendChild(root);

  return {
    unmount: () => root.remove(),
  };
}
