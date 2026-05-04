export function attachVisibilityHandler(
  onHide: () => void,
  onShow: () => void,
): () => void {
  const listener = () => {
    if (document.visibilityState === 'hidden') {
      onHide();
      return;
    }

    onShow();
  };

  document.addEventListener('visibilitychange', listener);

  return () => {
    document.removeEventListener('visibilitychange', listener);
  };
}
