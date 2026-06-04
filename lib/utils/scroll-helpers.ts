const DEFAULT_THRESHOLD_PX = 80;

export function isNearBottom(
  element: HTMLElement | null,
  thresholdPx = DEFAULT_THRESHOLD_PX,
): boolean {
  if (!element) {
    return true;
  }

  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;

  return distanceFromBottom <= thresholdPx;
}

export function scrollToBottom(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
}
