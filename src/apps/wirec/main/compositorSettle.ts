export const COMPOSITOR_SETTLE_MS = 150;

export function compositorSettle(ms = COMPOSITOR_SETTLE_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
