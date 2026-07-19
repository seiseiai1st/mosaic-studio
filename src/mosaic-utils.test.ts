import { describe, expect, it } from 'vitest'
import { clampRect, normalizeRect } from './mosaic-utils'
describe('normalizeRect', () => {
  it('normalizes a reverse drag into a positive rectangle', () => {
    expect(normalizeRect({ x: 80, y: 90 }, { x: 20, y: 30 })).toEqual({ x: 20, y: 30, width: 60, height: 60 })
  })
})
describe('clampRect', () => {
  it('keeps a selection inside the source image', () => {
    expect(clampRect({ x: 80, y: 40, width: 50, height: 90 }, 100, 100)).toEqual({ x: 80, y: 40, width: 20, height: 60 })
  })
})
