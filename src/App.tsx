import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  LockKeyhole,
  MousePointer2,
  RefreshCcw,
  Share2,
  Sparkles,
  Upload,
  WandSparkles,
  Zap,
} from 'lucide-react'
import {
  DEFAULT_SETTINGS,
  PALETTES,
  renderTrickArt,
  TRICK_PRESETS,
  type PaletteId,
  type TrickPresetId,
  type TrickSettings,
} from './trick-utils'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
type PreviewMode = 'timeline' | 'reveal'
type Notice = 'invalid' | 'loadError' | 'saved' | 'shared' | 'saveError' | ''

const noticeText: Record<Exclude<Notice, ''>, string> = {
  invalid: 'JPG・PNG・WebP画像を選んでください。',
  loadError: '画像を読み込めませんでした。別の画像をお試しください。',
  saved: '4K PNGを保存しました。',
  shared: '共有メニューを開きました。',
  saveError: '画像を保存できませんでした。',
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png')
  })
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function App() {
  const [source, setSource] = useState<HTMLImageElement | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [settings, setSettings] = useState<TrickSettings>(DEFAULT_SETTINGS)
  const [mode, setMode] = useState<PreviewMode>('timeline')
  const [pressing, setPressing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<Notice>('')
  const [rendering, setRendering] = useState(false)
  const [saving, setSaving] = useState(false)
  const outputCanvas = useRef<HTMLCanvasElement>(null)
  const previewCanvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const renderFrame = useRef(0)

  const activeMode = pressing ? 'reveal' : mode
  const palette = PALETTES.find((item) => item.id === settings.palette) ?? PALETTES[0]
  const outputSize = useMemo(() => {
    if (!source) return ''
    const scale = settings.longSide / Math.max(source.naturalWidth, source.naturalHeight)
    return `${Math.round(source.naturalWidth * scale).toLocaleString()} × ${Math.round(source.naturalHeight * scale).toLocaleString()} px`
  }, [settings.longSide, source])

  const paintPreview = useCallback(() => {
    const output = outputCanvas.current
    const preview = previewCanvas.current
    if (!output || !preview || !output.width) return
    const maxLongSide = activeMode === 'timeline' ? 468 : 1280
    const scale = Math.min(1, maxLongSide / Math.max(output.width, output.height))
    preview.width = Math.max(1, Math.round(output.width * scale))
    preview.height = Math.max(1, Math.round(output.height * scale))
    const context = preview.getContext('2d')
    if (!context) return
    context.imageSmoothingEnabled = activeMode === 'timeline'
    context.imageSmoothingQuality = 'high'
    context.clearRect(0, 0, preview.width, preview.height)
    context.drawImage(output, 0, 0, preview.width, preview.height)
  }, [activeMode])

  useEffect(() => {
    if (!source || !outputCanvas.current) return
    window.cancelAnimationFrame(renderFrame.current)
    setRendering(true)
    renderFrame.current = window.requestAnimationFrame(() => {
      const canvas = outputCanvas.current
      if (!canvas) return
      renderTrickArt(canvas, source, { ...settings, longSide: Math.min(1280, settings.longSide) })
      paintPreview()
      setRendering(false)
    })
    return () => window.cancelAnimationFrame(renderFrame.current)
  }, [paintPreview, settings, source])

  useEffect(() => paintPreview(), [paintPreview])
  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
  }, [sourceUrl])

  const acceptFile = (candidate?: File) => {
    if (!candidate) return
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setNotice('invalid')
      return
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const nextUrl = URL.createObjectURL(candidate)
    const image = new Image()
    image.onload = () => {
      setSource(image)
      setSourceFile(candidate)
      setSourceUrl(nextUrl)
      setSettings(DEFAULT_SETTINGS)
      setMode('timeline')
      setNotice('')
    }
    image.onerror = () => {
      URL.revokeObjectURL(nextUrl)
      setNotice('loadError')
    }
    image.src = nextUrl
  }

  const updateSetting = <K extends keyof TrickSettings>(key: K, value: TrickSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setNotice('')
  }

  const applyPreset = (preset: TrickPresetId) => {
    const recommendation = TRICK_PRESETS.find((item) => item.id === preset) ?? TRICK_PRESETS[0]
    setSettings((current) => ({
      ...current,
      preset,
      hiddenness: recommendation.hiddenness,
      glow: recommendation.glow,
    }))
    setNotice('')
  }

  const exportImage = async () => {
    if (!source || saving) return
    setSaving(true)
    setNotice('')
    try {
      const exportCanvas = document.createElement('canvas')
      renderTrickArt(exportCanvas, source, settings)
      const blob = await canvasToBlob(exportCanvas)
      const base = sourceFile?.name.replace(/\.[^.]+$/, '') || 'trick-art'
      const name = `${base}-neon-reveal.png`
      const file = new File([blob], name, { type: 'image/png' })
      if (navigator.maxTouchPoints > 0 && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
          await navigator.share({ files: [file], title: name })
          setNotice('shared')
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }
      downloadBlob(blob, name)
      setNotice('saved')
    } catch {
      setNotice('saveError')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSource(null)
    setSourceFile(null)
    setSourceUrl('')
    setNotice('')
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Neon Reveal ホーム">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>NEON</strong> REVEAL</span>
        </a>
        <div className="privacy-badge"><LockKeyhole size={15} /> 画像はアップロードされません</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><Zap size={14} fill="currentColor" /> 4K HIDDEN IMAGE MAKER</div>
        <h1>スクロールでは、見えない。<br /><em>長押しで、現れる。</em></h1>
        <p>普通の写真も、画像を1枚選ぶだけで自動補正。Xで話題の<br className="desktop-only" />「長押しすると浮かび上がる」トリックアートに変換します。</p>
      </section>

      {!source ? (
        <section
          className={`upload-card ${dragging ? 'dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            acceptFile(event.dataTransfer.files[0])
          }}
        >
          <div className="upload-orbit">
            <span className="orbit-ring" />
            <span className="upload-icon"><ImagePlus size={32} /></span>
          </div>
          <span className="step-pill">STEP 01</span>
          <h2>{dragging ? 'ここにドロップ' : '元になる画像を選ぶ'}</h2>
          <p>普通の写真もOK。明暗・輪郭・主役位置を自動で最適化します。</p>
          <button className="primary-button" type="button" onClick={() => fileInput.current?.click()}>
            <Upload size={18} /> 画像を選択
          </button>
          <small>JPG / PNG / WebP ・ 最大解像度の画像がおすすめ</small>
          {notice && <div className="notice error" role="alert">{noticeText[notice]}</div>}
        </section>
      ) : (
        <section className="studio" aria-label="トリックアート編集スタジオ">
          <div className="preview-panel">
            <div className="preview-header">
              <div>
                <span className="step-pill">LIVE PREVIEW</span>
                <h2>{activeMode === 'timeline' ? 'タイムラインでの見え方' : '長押し後の見え方'}</h2>
              </div>
              <div className="mode-toggle" role="group" aria-label="プレビュー表示">
                <button type="button" className={mode === 'timeline' ? 'active' : ''} onClick={() => setMode('timeline')}><EyeOff size={15} /> 縮小</button>
                <button type="button" className={mode === 'reveal' ? 'active' : ''} onClick={() => setMode('reveal')}><Eye size={15} /> 原寸</button>
              </div>
            </div>
            <div
              className={`preview-stage ${activeMode}`}
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setPressing(true) }}
              onPointerUp={() => setPressing(false)}
              onPointerCancel={() => setPressing(false)}
              onPointerLeave={() => setPressing(false)}
            >
              <div className="preview-glow" style={{ '--accent': palette.primary } as React.CSSProperties} />
              <canvas ref={previewCanvas} aria-label="生成画像プレビュー" />
              {rendering && <div className="rendering"><WandSparkles size={18} /> 生成中...</div>}
              <div className="press-hint"><MousePointer2 size={16} /> 押している間だけ原寸プレビュー</div>
            </div>
            <div className="preview-meta">
              <span><i className="status-dot" /> AUTO ENHANCED</span>
              <span>{outputSize}・PNG</span>
            </div>
          </div>

          <aside className="controls">
            <div className="control-heading">
              <span className="step-pill">STEP 02</span>
              <h2>見え方を調整</h2>
              <p>「おまかせ」が画像を自動解析します。用途が決まっていればプリセットを選べます。</p>
            </div>

            <div className="control-group preset-section">
              <div className="label-row">
                <label>自動変換モード</label>
                <b><WandSparkles size={11} /> AUTO</b>
              </div>
              <div className="preset-grid">
                {TRICK_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={settings.preset === item.id ? 'active' : ''}
                    onClick={() => applyPreset(item.id)}
                    aria-pressed={settings.preset === item.id}
                  >
                    <span>{item.name}</span>
                    <small>{item.description}</small>
                    {settings.preset === item.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <div className="label-row"><label>隠れ具合</label><b>{settings.hiddenness}%</b></div>
              <input type="range" min="55" max="94" value={settings.hiddenness} onChange={(event) => updateSetting('hiddenness', Number(event.target.value))} style={{ '--value': `${((settings.hiddenness - 55) / 39) * 100}%` } as React.CSSProperties} />
              <div className="range-ends"><span>見えやすい</span><span>しっかり隠す</span></div>
            </div>

            <div className="control-group">
              <div className="label-row"><label>発光アクセント</label><b>{settings.glow}%</b></div>
              <input type="range" min="10" max="90" value={settings.glow} onChange={(event) => updateSetting('glow', Number(event.target.value))} style={{ '--value': `${((settings.glow - 10) / 80) * 100}%` } as React.CSSProperties} />
              <div className="range-ends"><span>控えめ</span><span>ネオン強め</span></div>
            </div>

            <div className="control-group">
              <div className="label-row"><label>カラーパレット</label></div>
              <div className="palette-grid">
                {PALETTES.map((item) => (
                  <button key={item.id} type="button" className={settings.palette === item.id ? 'active' : ''} onClick={() => updateSetting('palette', item.id as PaletteId)}>
                    <span style={{ background: `linear-gradient(135deg,${item.primary},${item.secondary})` }} />
                    <small>{item.name}</small>
                    {settings.palette === item.id && <Check size={13} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group output-group">
              <div className="label-row"><label>出力サイズ</label></div>
              <div className="size-toggle">
                {[2048, 4096].map((size) => (
                  <button type="button" key={size} className={settings.longSide === size ? 'active' : ''} onClick={() => updateSetting('longSide', size)}>
                    {size === 4096 ? '4K 推奨' : '2K 軽量'}
                  </button>
                ))}
              </div>
            </div>

            <button className="download-button" type="button" onClick={exportImage} disabled={saving || rendering}>
              {navigator.maxTouchPoints > 0 ? <Share2 size={19} /> : <Download size={19} />}
              {saving ? '書き出し中...' : '4K PNGを書き出す'}
            </button>
            {notice && <div className={`notice ${notice === 'saveError' ? 'error' : ''}`} role="status">{noticeText[notice]}</div>}
            <button className="reset-button" type="button" onClick={reset}><RefreshCcw size={15} /> 別の画像で作る</button>
          </aside>
          <canvas ref={outputCanvas} className="output-canvas" aria-hidden="true" />
        </section>
      )}

      <section className="how-it-works">
        <div><span>01</span><strong>画像を選ぶ</strong><small>人物もイラストもOK</small></div>
        <i />
        <div><span>02</span><strong>見え方を調整</strong><small>縮小と原寸を比較</small></div>
        <i />
        <div><span>03</span><strong>Xにポスト</strong><small>PNGをそのまま投稿</small></div>
      </section>

      <footer><span>NEON REVEAL</span><span>すべての画像処理は、この端末内で完結します。</span></footer>
      <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => acceptFile(event.target.files?.[0])} />
    </main>
  )
}

export default App
