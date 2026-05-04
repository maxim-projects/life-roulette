export interface ModeSelectProps {
  onVsAI: () => void;
  onHotSeat: () => void;
  onBack?: () => void;
}

export function mountModeSelect(parent: HTMLElement, props: ModeSelectProps): { unmount: () => void } {
  const root = document.createElement('div');
  root.style.cssText =
    'display:flex;flex:1;align-items:center;justify-content:center;padding:24px;';

  const panel = document.createElement('div');
  panel.style.cssText =
    'width:min(100%,420px);background:rgba(15,20,32,0.92);border:1px solid #31415d;border-radius:24px;padding:28px;';

  const title = document.createElement('h2');
  title.textContent = 'Выбери режим';
  title.style.cssText = 'font-size:32px;margin-bottom:20px;text-align:center;';

  const list = document.createElement('div');
  list.style.cssText = 'display:grid;gap:12px;';

  const vsAi = document.createElement('button');
  vsAi.textContent = 'vs компьютер';
  vsAi.style.cssText =
    'padding:16px;border:none;border-radius:16px;background:#2a3b5b;color:white;font-size:18px;';
  vsAi.onclick = props.onVsAI;

  const hotSeat = document.createElement('button');
  hotSeat.textContent = 'hot-seat';
  hotSeat.style.cssText =
    'padding:16px;border:none;border-radius:16px;background:#22314a;color:white;font-size:18px;';
  hotSeat.onclick = props.onHotSeat;

  list.append(vsAi, hotSeat);
  panel.append(title, list);

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
