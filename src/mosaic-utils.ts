export type Point = { x: number; y: number }
export type MosaicRect = { x: number; y: number; width: number; height: number }
export function normalizeRect(start: Point, end: Point): MosaicRect {
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) }
}
export function clampRect(rect: MosaicRect, width: number, height: number): MosaicRect {
  const x = Math.max(0, Math.min(rect.x, width)); const y = Math.max(0, Math.min(rect.y, height))
  return { x, y, width: Math.max(0, Math.min(rect.width, width - x)), height: Math.max(0, Math.min(rect.height, height - y)) }
}
