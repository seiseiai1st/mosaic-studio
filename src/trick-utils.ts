export type PaletteId = 'cyan-magenta' | 'violet-ice' | 'acid-rose' | 'ember-blue'

export type TrickSettings = {
  hiddenness: number
  glow: number
  palette: PaletteId
  longSide: number
}

export const DEFAULT_SETTINGS: TrickSettings = {
  hiddenness: 82,
  glow: 54,
  palette: 'cyan-magenta',
  longSide: 4096,
}

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
  const data = imageData.data
  const palette = PALETTES.find((item) => item.id === settings.palette) ?? PALETTES[0]
  const primary = hexToRgb(palette.primary)
  const secondary = hexToRgb(palette.secondary)
  const hidden = settings.hiddenness / 100
  const glow = settings.glow / 100
  const contrast = 1.35 + hidden * 0.8

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const pixel = index / 4
    const x = pixel % canvas.width
    const y = Math.floor(pixel / canvas.width)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const value = clamp01((luminance - 0.5) * contrast + 0.5)
    const threshold = (BAYER_4[(y % 4) * 4 + (x % 4)] + 0.5) / 16
    const dither = value > threshold ? 1 : 0
    const highlightStart = 0.76 + hidden * 0.12
    const highlight = clamp01((value - highlightStart) / (1 - highlightStart))
    const chromaBias = clamp01((r - b + 255) / 510)
    const mix = clamp01(chromaBias * 0.7 + ((x / canvas.width + y / canvas.height) % 1) * 0.3)
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

  context.putImageData(imageData, 0, 0)
}
