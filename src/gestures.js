export function dxToAction(dx) {
  if (dx > 60) return 'star'
  if (dx < -60) return 'pass'
  return 'noop'
}
