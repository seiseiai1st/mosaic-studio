export type PaletteId = 'cyan-magenta' | 'violet-ice' | 'acid-rose' | 'ember-blue'
export type TrickPresetId = 'auto' | 'portrait' | 'illustration' | 'silhouette'

export type TrickSettings = {
  hiddenness: number
  glow: number
  palette: PaletteId
  preset: TrickPresetId
  longSide: number
}

export const DEFAULT_SETTINGS: TrickSettings = {
  hiddenness: 80,
  glow: 58,
  palette: 'cyan-magenta',
  preset: 'auto',
  longSide: 4096,
}

export const TRICK_PRESETS = [
  { id: 'auto', name: 'おまかせ', description: '普通の写真を自動解析', hiddenness: 80, glow: 58 },
  { id: 'portrait', name: '人物', description: '中央の顔・輪郭を強調', hiddenness: 84, glow: 62 },
  { id: 'illustration', name: 'イラスト', description: '線画と色の境界を強調', hiddenness: 78, glow: 54 },
  { id: 'silhouette', name: 'シルエット', description: '明部だけを強く発光', hiddenness: 88, glow: 74 },
] as const

export const PALETTES = [
  { id: 'cyan-magenta', name: 'Cyan Pop', primary: '#17f5e4', secondary: '#e55bff' },
  { id: 'violet-ice', name: 'Moon Ice', primary: '#89eaff', secondary: '#7772ff' },
  { id: 'acid-rose', name: 'Acid Rose', primary: '#dfff4f', secondary: '#ff4fa3' },
  { id: 'ember-blue', name: 'Ember', primary: '#ff9b54', secondary: '#48c8ff' },
] as const

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
]

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function getOutputDimensions(width: number, height: number, longSide: number) {
  const scale = longSide / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function getHistogramBounds(histogram: ArrayLike<number>, total: number, lowerQuantile = 0.02, upperQuantile = 0.98) {
  if (total <= 0) return { low: 0, high: 255 }
  const lowerTarget = total * lowerQuantile
  const upperTarget = total * upperQuantile
  let cumulative = 0
  let low = 0
  let high = 255
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value] || 0
    if (cumulative >= lowerTarget) {
      low = value
      break
    }
  }
  cumulative = 0
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value] || 0
    if (cumulative >= upperTarget) {
      high = value
      break
    }
  }
  if (high - low < 24) {
    const center = (high + low) / 2
    low = Math.max(0, Math.round(center - 12))
    high = Math.min(255, Math.round(center + 12))
  }
  return { low, high }
}

export function enhanceTone(luminance: number, edge: number, focus: number, preset: TrickPresetId) {
  const value = clamp01(luminance)
  const edgeValue = clamp01(edge)
  const focusValue = clamp01(focus)
  if (preset === 'portrait') {
    return clamp01((value * 0.82 + edgeValue * 0.24) * (0.48 + focusValue * 0.52))
  }
  if (preset === 'illustration') {
    return clamp01(Math.pow(value, 0.9) * 0.88 + edgeValue * 0.48)
  }
  if (preset === 'silhouette') {
    const isolated = clamp01((value - 0.42) * 2.1)
    return clamp01(isolated * (0.7 + focusValue * 0.3) + edgeValue * 0.1)
  }
  return clamp01((value * 0.9 + edgeValue * 0.3) * (0.72 + focusValue * 0.28))
}

export function transformTrickPixels(data: Uint8ClampedArray, width: number, height: number, settings: TrickSettings) {
  const palette = PALETTES.find((item) => item.id === settings.palette) ?? PALETTES[0]
  const primary = hexToRgb(palette.primary)
  const secondary = hexToRgb(palette.secondary)
  const hidden = settings.hiddenness / 100
  const glow = settings.glow / 100
  const histogram = new Uint32Array(256)
  let sampleCount = 0
  for (let index = 0; index < data.length; index += 64) {
    const luminance = Math.round(0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2])
    histogram[luminance] += 1
    sampleCount += 1
  }
  const bounds = getHistogramBounds(histogram, sampleCount)
  const tonalRange = Math.max(24, bounds.high - bounds.low)
  const contrast = settings.preset === 'illustration' ? 1.35 : settings.preset === 'silhouette' ? 1.58 : 1.22

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const pixel = index / 4
    const x = pixel % width
    const y = Math.floor(pixel / width)
    const luminance255 = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const normalized = clamp01((luminance255 - bounds.low) / tonalRange)
    const contrasted = clamp01((normalized - 0.5) * contrast + 0.5)
    const rightOffset = x + 1 < width ? index + 4 : index
    const downOffset = y + 1 < height ? index + width * 4 : index
    const rightLuminance = (0.2126 * data[rightOffset] + 0.7152 * data[rightOffset + 1] + 0.0722 * data[rightOffset + 2]) / 255
    const downLuminance = (0.2126 * data[downOffset] + 0.7152 * data[downOffset + 1] + 0.0722 * data[downOffset + 2]) / 255
    const sourceLuminance = luminance255 / 255
    const edge = clamp01((Math.abs(sourceLuminance - rightLuminance) + Math.abs(sourceLuminance - downLuminance)) * 3.2)
    const nx = x / width - 0.5
    const ny = y / height - 0.47
    const focus = clamp01(1 - Math.sqrt(nx * nx * 2.35 + ny * ny * 1.55))
    const value = enhanceTone(contrasted, edge, focus, settings.preset)
    const threshold = (BAYER_4[(y % 4) * 4 + (x % 4)] + 0.5) / 16
    const dither = value > threshold ? 1 : 0
    const presetOffset = settings.preset === 'silhouette' ? -0.09 : settings.preset === 'illustration' ? 0.025 : 0
    const highlightStart = clamp01(0.74 + hidden * 0.12 + presetOffset)
    const highlight = clamp01((value - highlightStart) / (1 - highlightStart))
    const chromaBias = clamp01((r - b + 255) / 510)
    const mix = clamp01(chromaBias * 0.7 + ((x / width + y / height) % 1) * 0.3)
    const inkR = primary[0] * (1 - mix) + secondary[0] * mix
    const inkG = primary[1] * (1 - mix) + secondary[1] * mix
    const inkB = primary[2] * (1 - mix) + secondary[2] * mix
    const lowDetail = value * (0.16 - hidden * 0.085)
    const microDetail = dither * value * (0.2 - hidden * 0.09)
    const neon = Math.pow(highlight, 0.65) * (0.34 + glow * 0.66)
    const intensity = clamp01(lowDetail + microDetail + neon)
    const blackLift = 2 + Math.round((1 - hidden) * 8)

    data[index] = Math.round(blackLift + inkR * intensity)
    data[index + 1] = Math.round(blackLift + inkG * intensity)
    data[index + 2] = Math.round(blackLift + inkB * intensity)
    data[index + 3] = 255
  }
  return data
}

export function renderTrickArt(canvas: HTMLCanvasElement, image: HTMLImageElement, settings: TrickSettings) {
  const dimensions = getOutputDimensions(image.naturalWidth, image.naturalHeight, settings.longSide)
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  transformTrickPixels(imageData.data, canvas.width, canvas.height, settings)
  context.putImageData(imageData, 0, 0)
}
