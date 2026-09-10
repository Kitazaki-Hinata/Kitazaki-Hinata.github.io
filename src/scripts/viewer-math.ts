export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function fitScale(width: number, height: number, viewportWidth: number, viewportHeight: number): number {
  return Math.min(1, viewportWidth / width, viewportHeight / height);
}
export function constrainPan(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const maxX = Math.max(0, (width - viewportWidth) / 2);
  const maxY = Math.max(0, (height - viewportHeight) / 2);
  return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
}
export function zoomAt(x: number, y: number, ratio: number, anchorX: number, anchorY: number) {
  return { x: anchorX - (anchorX - x) * ratio, y: anchorY - (anchorY - y) * ratio };
}
