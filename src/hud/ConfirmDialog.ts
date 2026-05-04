export interface ConfirmDialogProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showConfirmDialog(
  parent: HTMLElement,
  props: ConfirmDialogProps,
): { close: () => void } {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px;';

  const dialog = document.createElement('div');
  dialog.style.cssText =
    'background:#151826;border:1px solid #2d3550;border-radius:18px;padding:24px;max-width:420px;width:min(100%,420px);box-shadow:0 24px 48px rgba(0,0,0,0.35);';

  const message = document.createElement('p');
  message.textContent = props.message;
  message.style.cssText =
    'font-size:18px;line-height:1.45;text-align:center;margin-bottom:20px;';

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;gap:12px;justify-content:center;';

  const cancelButton = document.createElement('button');
  cancelButton.textContent = props.cancelText ?? 'Отмена';
  cancelButton.style.cssText =
    'padding:12px 18px;background:#2b3144;color:#f3f5ff;border:none;border-radius:12px;';
  cancelButton.onclick = () => {
    close();
    props.onCancel?.();
  };

  const confirmButton = document.createElement('button');
  confirmButton.textContent = props.confirmText ?? 'Подтвердить';
  confirmButton.style.cssText =
    'padding:12px 18px;background:#d4552d;color:white;border:none;border-radius:12px;font-weight:700;';
  confirmButton.onclick = () => {
    close();
    props.onConfirm();
  };

  buttons.append(cancelButton, confirmButton);
  dialog.append(message, buttons);
  overlay.appendChild(dialog);
  parent.appendChild(overlay);

  function close(): void {
    overlay.remove();
  }

  return { close };
}
