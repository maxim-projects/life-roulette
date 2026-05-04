export interface PlayerCountSelectProps {
  onCount: (count: number) => void;
  onBack?: () => void;
}

export function mountPlayerCountSelect(
  parent: HTMLElement,
  props: PlayerCountSelectProps,
): { unmount: () => void } {
  const root = document.createElement('div');
  root.style.cssText =
    'display:flex;flex:1;align-items:center;justify-content:center;padding:24px;';

  const panel = document.createElement('div');
  panel.style.cssText =
    'width:min(100%,520px);background:rgba(15,20,32,0.92);border:1px solid #31415d;border-radius:24px;padding:28px;';

  const title = document.createElement('h2');
  title.textContent = 'Сколько игроков?';
  title.style.cssText = 'font-size:32px;margin-bottom:20px;text-align:center;';

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;';

  for (let count = 2; count <= 7; count += 1) {
    const button = document.createElement('button');
    button.textContent = String(count);
    button.style.cssText =
      'padding:18px;border:none;border-radius:16px;background:#22314a;color:white;font-size:20px;font-weight:700;';
    button.onclick = () => props.onCount(count);
    grid.appendChild(button);
  }

  panel.append(title, grid);

  if (props.onBack) {
    const back = document.createElement('button');
    back.textContent = 'Назад';
    back.style.cssText =
      'margin-top:18px;padding:12px 16px;border:none;border-radius:14px;background:#1b2234;color:#cbd7f6;width:100%;';
    back.onclick = props.onBack;
    panel.appendChild(back);
  }

  root.appendChild(panel);
  parent.appendChild(root);

  return { unmount: () => root.remove() };
}
