import type { MountableHud } from './PassDeviceScreen';

export interface LoadingScreenProps {
  title?: string;
  progress?: number;
  message?: string;
  retryText?: string;
  onRetry?: () => void;
}

export function mountLoadingScreen(
  parent: HTMLElement,
  initialProps: LoadingScreenProps = {},
): MountableHud<LoadingScreenProps> {
  const root = document.createElement('div');
  root.style.cssText =
    'display:flex;align-items:center;justify-content:center;flex:1;min-height:100%;padding:24px;background:linear-gradient(180deg,#0f1627 0%,#070a12 100%);';

  const card = document.createElement('div');
  card.style.cssText =
    'width:min(100%,480px);background:rgba(14,20,34,0.88);border:1px solid #2e3c58;border-radius:24px;padding:32px;';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:28px;margin-bottom:16px;';

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;
  progress.style.cssText = 'width:100%;height:16px;margin-bottom:16px;';

  const message = document.createElement('p');
  message.style.cssText = 'color:#cdd7f2;line-height:1.5;';

  const retryButton = document.createElement('button');
  retryButton.style.cssText =
    'margin-top:20px;padding:12px 18px;border:none;border-radius:12px;background:#d4552d;color:white;display:none;';

  card.append(title, progress, message, retryButton);
  root.appendChild(card);
  parent.appendChild(root);

  const update = (props: LoadingScreenProps): void => {
    initialProps = props;
    title.textContent = props.title ?? 'Загрузка';
    progress.value = Math.max(0, Math.min(100, Math.round((props.progress ?? 0) * 100)));
    message.textContent = props.message ?? 'Подготавливаем сцену и интерфейс.';
    retryButton.textContent = props.retryText ?? 'Обновить';
    retryButton.style.display = props.onRetry ? 'inline-flex' : 'none';
    retryButton.onclick = props.onRetry ?? null;
  };

  update(initialProps);

  return {
    update,
    unmount: () => root.remove(),
  };
}
