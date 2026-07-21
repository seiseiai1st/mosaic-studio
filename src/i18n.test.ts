import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, getInitialLanguage, translations } from './i18n'

describe('language selection', () => {
  it('defaults to Japanese when no supported preference exists', () => {
    expect(DEFAULT_LANGUAGE).toBe('ja')
    expect(getInitialLanguage()).toBe('ja')
    expect(getInitialLanguage('fr')).toBe('ja')
  })

  it('restores each supported language', () => {
    expect(getInitialLanguage('ja')).toBe('ja')
    expect(getInitialLanguage('zh')).toBe('zh')
    expect(getInitialLanguage('en')).toBe('en')
  })

  it('provides core interface text for every language', () => {
    for (const language of ['ja', 'zh', 'en'] as const) {
      expect(translations[language].chooseImage).toBeTruthy()
      expect(translations[language].saveImage).toBeTruthy()
      expect(translations[language].rectsApplied(2)).toContain('2')
    }
  })
})
