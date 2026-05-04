function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export async function loadSceneAssets(
  onProgress?: (progress: number) => void,
): Promise<void> {
  const milestones = [0.18, 0.52, 0.84, 1];

  for (const milestone of milestones) {
    onProgress?.(milestone);
    await wait(45);
  }
}
