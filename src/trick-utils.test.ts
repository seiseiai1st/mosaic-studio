import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, clamp01, enhanceTone, getHistogramBounds, getOutputDimensions, hexToRgb, transformTrickPixels } from './trick-utils'

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

  it('stretches a narrow ordinary-photo luminance range', () => {
    const histogram = new Uint32Array(256)
    histogram[110] = 20
    histogram[116] = 60
    histogram[122] = 20
    expect(getHistogramBounds(histogram, 100)).toEqual({ low: 104, high: 128 })
  })

  it('uses edge detail and center focus according to the selected preset', () => {
    const flatBackground = enhanceTone(0.5, 0, 0, 'portrait')
    const focusedFaceEdge = enhanceTone(0.5, 0.6, 1, 'portrait')
    const illustrationLine = enhanceTone(0.3, 0.8, 0.3, 'illustration')
    expect(focusedFaceEdge).toBeGreaterThan(flatBackground)
    expect(illustrationLine).toBeGreaterThan(0.5)
  })

  it('turns a low-contrast ordinary image into dark neon detail without flattening it', () => {
    const pixels = new Uint8ClampedArray([
      112, 112, 112, 255, 116, 116, 116, 255,
      118, 118, 118, 255, 138, 138, 138, 255,
    ])
    transformTrickPixels(pixels, 2, 2, { ...DEFAULT_SETTINGS, longSide: 2 })
    const outputLuminance = [pixels[1], pixels[5], pixels[9], pixels[13]]
    expect(Math.max(...outputLuminance)).toBeGreaterThan(Math.min(...outputLuminance))
    expect(Math.max(...outputLuminance)).toBeLessThan(180)
    expect(pixels.every((value, index) => index % 4 === 3 ? value === 255 : value >= 0)).toBe(true)
  })
})
