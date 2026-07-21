import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, Image as ImageIcon, Languages, LockKeyhole, MousePointer2, RotateCcw, ShieldCheck, Sparkles, Trash2, Undo2, Upload, WandSparkles } from 'lucide-react'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, translations, type Language } from './i18n'
import { clampRect, normalizeRect, type MosaicRect, type Point } from './mosaic-utils'

type ExportType = 'image/png' | 'image/jpeg'
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function drawMosaic(context: CanvasRenderingContext2D, image: HTMLImageElement, rects: MosaicRect[], pixelSize: number, whiteBackground = false) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  if (whiteBackground) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  }
  context.drawImage(image, 0, 0)
  for (const rawRect of rects) {
    const rect = clampRect(rawRect, context.canvas.width, context.canvas.height)
    if (rect.width < 1 || rect.height < 1) continue
    const sampleWidth = Math.max(1, Math.ceil(rect.width / pixelSize))
    const sampleHeight = Math.max(1, Math.ceil(rect.height / pixelSize))
    const buffer = document.createElement('canvas')
    buffer.width = sampleWidth
    buffer.height = sampleHeight
    const bufferContext = buffer.getContext('2d')
    if (!bufferContext) continue
    bufferContext.imageSmoothingEnabled = true
    bufferContext.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, sampleWidth, sampleHeight)
    context.save()
    context.imageSmoothingEnabled = false
    context.drawImage(buffer, 0, 0, sampleWidth, sampleHeight, rect.x, rect.y, rect.width, rect.height)
    context.restore()
  }
}

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)))
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [rects, setRects] = useState<MosaicRect[]>([])
  const [draft, setDraft] = useState<MosaicRect | null>(null)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [pixelSize, setPixelSize] = useState(18)
  const [exportType, setExportType] = useState<ExportType>('image/png')
  const [quality, setQuality] = useState(92)
  const [draggingFile, setDraggingFile] = useState(false)
  const [message, setMessage] = useState<'invalidFile' | 'loadError' | ''>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const downloadCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const hasImage = Boolean(image)
  const t = translations[language]
  const dimensions = image ? `${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px` : ''
  const outputName = useMemo(() => {
    const base = file?.name.replace(/\.[^.]+$/, '') || 'mosaic-image'
    return `${base}-mosaic.${exportType === 'image/png' ? 'png' : 'jpg'}`
  }, [file, exportType])

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
    }
    const context = canvas.getContext('2d')
    if (!context) return
    drawMosaic(context, image, rects, pixelSize)
    if (draft) {
      context.save()
      context.fillStyle = 'rgba(108, 92, 231, 0.18)'
      context.strokeStyle = '#6c5ce7'
      context.lineWidth = Math.max(2, image.naturalWidth / 600)
      context.setLineDash([10, 7])
      context.fillRect(draft.x, draft.y, draft.width, draft.height)
      context.strokeRect(draft.x, draft.y, draft.width, draft.height)
      context.restore()
    }
  }, [draft, image, pixelSize, rects])

  useEffect(() => renderCanvas(), [renderCanvas])
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language
    document.title = t.metaTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.metaDescription)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language, t.metaDescription, t.metaTitle])

  const resetEditor = () => { setRects([]); setDraft(null); setDragStart(null); setMessage('') }

  const acceptFile = (candidate?: File) => {
    if (!candidate) return
    if (!ACCEPTED_TYPES.includes(candidate.type)) { setMessage('invalidFile'); return }
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    const nextUrl = URL.createObjectURL(candidate)
    const nextImage = new Image()
    nextImage.onload = () => {
      const canvas = canvasRef.current
      if (canvas) { canvas.width = nextImage.naturalWidth; canvas.height = nextImage.naturalHeight }
      setFile(candidate); setImage(nextImage); setImageUrl(nextUrl); resetEditor()
    }
    nextImage.onerror = () => { URL.revokeObjectURL(nextUrl); setMessage('loadError') }
    nextImage.src = nextUrl
  }

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return { x: ((event.clientX - bounds.left) / bounds.width) * canvas.width, y: ((event.clientY - bounds.top) / bounds.height) * canvas.height }
  }
  const startSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    setDragStart(point); setDraft({ x: point.x, y: point.y, width: 0, height: 0 }); setMessage('')
  }
  const moveSelection = (event: React.PointerEvent<HTMLCanvasElement>) => { if (dragStart) setDraft(normalizeRect(dragStart, pointFromEvent(event))) }
  const finishSelection = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart) return
    const rect = normalizeRect(dragStart, pointFromEvent(event))
    const minimum = image ? Math.max(4, image.naturalWidth * 0.005) : 4
    if (rect.width >= minimum && rect.height >= minimum) setRects((current) => [...current, rect])
    setDragStart(null); setDraft(null)
  }

  const download = () => {
    if (!image) return
    const canvas = downloadCanvasRef.current || document.createElement('canvas')
    downloadCanvasRef.current = canvas
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) return
    drawMosaic(context, image, rects, pixelSize, exportType === 'image/jpeg')
    const link = document.createElement('a')
    link.download = outputName; link.href = canvas.toDataURL(exportType, quality / 100); link.click()
  }
  const removeImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setFile(null); setImage(null); setImageUrl(''); resetEditor()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={t.brandAria}><span className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></span><span className="brand-copy"><strong>Mosaic</strong><b>Studio</b></span></a>
        <div className="topbar-actions">
          <div className="privacy-badge"><ShieldCheck size={16} /><span>{t.privacyBadge}</span></div>
          <div className="language-switcher" role="group" aria-label={t.languageAria}>
            <Languages size={15} aria-hidden="true" />
            {([['ja', '日本語'], ['zh', '中文'], ['en', 'EN']] as const).map(([code, label]) => (
              <button key={code} type="button" className={language === code ? 'active' : ''} onClick={() => setLanguage(code)} aria-pressed={language === code}>{label}</button>
            ))}
          </div>
        </div>
      </header>
      <section className="hero" id="top">
        <div className="eyebrow"><span /> {t.eyebrow}</div>
        <h1>{t.heroTitle}<br /><em>{t.heroAccent}</em></h1>
        <p>{t.heroLead}<br className="desktop-break" />{t.heroSub}</p>
      </section>
      <section className={`editor-card ${hasImage ? 'has-image' : ''}`} aria-label={t.editorAria}>
        {!hasImage ? (
          <div className={`drop-zone ${draggingFile ? 'dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true) }} onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingFile(false) }}
            onDrop={(event) => { event.preventDefault(); setDraggingFile(false); acceptFile(event.dataTransfer.files[0]) }}>
            <div className="upload-illustration"><span className="image-card card-back"><ImageIcon size={26} /></span><span className="image-card card-front"><Upload size={27} /></span></div>
            <h2>{draggingFile ? t.dropActive : t.dropTitle}</h2><p>{t.dropSub}</p>
            <button className="primary-button" type="button" onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} /> {t.chooseImage}</button>
            <span className="file-note">{t.fileNote}</span>{message && <div className="error-message" role="alert">{t[message]}</div>}
          </div>
        ) : (
          <div className="editor-layout">
            <div className="canvas-panel">
              <div className="canvas-toolbar"><div><span className="status-dot" /> {t.selectMode}</div><span><MousePointer2 size={14} /> {t.dragAdd}</span></div>
              <div className="canvas-stage">
                <canvas ref={canvasRef} onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={finishSelection}
                  onPointerCancel={() => { setDragStart(null); setDraft(null) }} aria-label={t.canvasAria} tabIndex={0} />
                {rects.length === 0 && !draft && <div className="canvas-hint"><WandSparkles size={19} /> {t.canvasHint}</div>}
              </div>
              <div className="image-meta"><span>{file?.name}</span><span>{dimensions}</span></div>
            </div>
            <aside className="controls-panel">
              <div className="control-section">
                <div className="section-title"><span>01</span><div><b>{t.pixelTitle}</b><small>{t.pixelSub}</small></div></div>
                <div className="range-row"><span>{t.fine}</span><b>{pixelSize}px</b><span>{t.coarse}</span></div>
                <input className="range" type="range" min="6" max="60" value={pixelSize} style={{ '--range-value': `${((pixelSize - 6) / 54) * 100}%` } as React.CSSProperties} onChange={(event) => setPixelSize(Number(event.target.value))} aria-label={t.pixelAria} />
              </div>
              <div className="control-section">
                <div className="section-title"><span>02</span><div><b>{t.editTitle}</b><small>{t.rectsApplied(rects.length)}</small></div></div>
                <div className="edit-actions"><button type="button" onClick={() => setRects((current) => current.slice(0, -1))} disabled={rects.length === 0}><Undo2 size={17} /> {t.undo}</button><button type="button" onClick={() => setRects([])} disabled={rects.length === 0}><RotateCcw size={17} /> {t.clearAll}</button></div>
              </div>
              <div className="control-section export-section">
                <div className="section-title"><span>03</span><div><b>{t.exportTitle}</b><small>{t.exportSub}</small></div></div>
                <div className="format-toggle" aria-label={t.formatAria}><button type="button" className={exportType === 'image/png' ? 'active' : ''} onClick={() => setExportType('image/png')}><Check size={14} /> PNG</button><button type="button" className={exportType === 'image/jpeg' ? 'active' : ''} onClick={() => setExportType('image/jpeg')}><Check size={14} /> JPG</button></div>
                {exportType === 'image/jpeg' && <label className="quality-row">{t.quality} <b>{quality}%</b><input type="range" min="60" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}
                <button className="download-button" type="button" onClick={download} disabled={rects.length === 0}><Download size={19} /> {t.saveImage}</button>
              </div>
              <button className="remove-button" type="button" onClick={removeImage}><Trash2 size={16} /> {t.chooseAnother}</button>
            </aside>
          </div>
        )}
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => acceptFile(event.target.files?.[0])} />
      </section>
      <section className="trust-row" aria-label={t.featuresAria}>
        <div><span><LockKeyhole size={19} /></span><p><strong>{t.privateTitle}</strong><small>{t.privateSub}</small></p></div><i />
        <div><span><WandSparkles size={19} /></span><p><strong>{t.instantTitle}</strong><small>{t.instantSub}</small></p></div><i />
        <div><span><ImageIcon size={19} /></span><p><strong>{t.qualityTitle}</strong><small>{t.qualitySub}</small></p></div>
      </section>
      <footer><span>© 2026 Mosaic Studio</span><span>{t.footerPrivacy}</span></footer>
    </main>
  )
}
export default App
