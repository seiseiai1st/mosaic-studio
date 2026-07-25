import { describe, expect, it } from 'vitest'
import { clamp01, getOutputDimensions, hexToRgb } from './trick-utils'

describe('trick art utilities', () => {
  it('keeps the aspect ratio when sizing a portrait output', () => {
    expect(getOutputDimensions(1000, 2000, 4096)).toEqual({ width: 2048, height: 4096 })
  })

  it('keeps the aspect ratio when sizing a landscape output', () => {
    expect(getOutputDimensions(3000, 2000, 2048)).toEqual({ width: 2048, height: 1365 })
  })

  it('converts palette colors and clamps values', () => {
    expect(hexToRgb('#17f5e4')).toEqual([23, 245, 228])
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
  })
})
