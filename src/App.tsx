import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, Image as ImageIcon, LockKeyhole, MousePointer2, RotateCcw, ShieldCheck, Sparkles, Trash2, Undo2, Upload, WandSparkles } from 'lucide-react'
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

function canvasToBlob(canvas: HTMLCanvasElement, type: ExportType, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像を書き出せませんでした。'))
    }, type, quality)
  })
}

function triggerDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Safari may still be reading the Blob after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}

function isMobileLikeDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches
}

function App() {
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
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const downloadCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const hasImage = Boolean(image)
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

  const resetEditor = () => { setRects([]); setDraft(null); setDragStart(null); setMessage('') }

  const acceptFile = (candidate?: File) => {
    if (!candidate) return
    if (!ACCEPTED_TYPES.includes(candidate.type)) { setMessage('JPG・PNG・WebP画像を選択してください。'); return }
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    const nextUrl = URL.createObjectURL(candidate)
    const nextImage = new Image()
    nextImage.onload = () => {
      const canvas = canvasRef.current
      if (canvas) { canvas.width = nextImage.naturalWidth; canvas.height = nextImage.naturalHeight }
      setFile(candidate); setImage(nextImage); setImageUrl(nextUrl); resetEditor()
    }
    nextImage.onerror = () => { URL.revokeObjectURL(nextUrl); setMessage('画像を読み込めませんでした。別の画像をお試しください。') }
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

  const download = async () => {
    if (!image || isSaving) return
    setIsSaving(true)
    setMessage('')
    try {
      const canvas = downloadCanvasRef.current || document.createElement('canvas')
      downloadCanvasRef.current = canvas
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('画像の保存機能を利用できません。')
      drawMosaic(context, image, rects, pixelSize, exportType === 'image/jpeg')

      const blob = await canvasToBlob(canvas, exportType, quality / 100)
      let shareData: ShareData | null = null
      if (isMobileLikeDevice() && typeof navigator.share === 'function' && typeof File === 'function') {
        shareData = { files: [new File([blob], outputName, { type: exportType })], title: outputName }
        try {
          if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) shareData = null
        } catch {
          shareData = null
        }
      }

      if (shareData) {
        try {
          await navigator.share(shareData)
          setMessage('共有メニューから画像を保存できます。')
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            setMessage('保存をキャンセルしました。')
            return
          }
          // Some embedded mobile browsers expose share() but reject files.
        }
      }

      triggerDownload(blob, outputName)
      setMessage('画像を保存しました。ダウンロード一覧をご確認ください。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '画像を保存できませんでした。別のブラウザでお試しください。')
    } finally {
      setIsSaving(false)
    }
  }
  const removeImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setFile(null); setImage(null); setImageUrl(''); resetEditor()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Mosaic Studio ホーム"><span className="brand-mark"><Sparkles size={19} strokeWidth={2.2} /></span><span className="brand-copy"><strong>Mosaic</strong><b>Studio</b></span></a>
        <div className="privacy-badge"><ShieldCheck size={16} /><span>画像はアップロードされません</span></div>
      </header>
      <section className="hero" id="top">
        <div className="eyebrow"><span /> かんたん・安全・無料</div>
        <h1>隠したいところを、<br /><em>サッとモザイク。</em></h1>
        <p>画像を選んで、隠したい範囲をなぞるだけ。<br className="desktop-break" />すべての処理がブラウザ内で完結します。</p>
      </section>
      <section className={`editor-card ${hasImage ? 'has-image' : ''}`} aria-label="画像モザイク編集ツール">
        {!hasImage ? (
          <div className={`drop-zone ${draggingFile ? 'dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true) }} onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDraggingFile(false) }}
            onDrop={(event) => { event.preventDefault(); setDraggingFile(false); acceptFile(event.dataTransfer.files[0]) }}>
            <div className="upload-illustration"><span className="image-card card-back"><ImageIcon size={26} /></span><span className="image-card card-front"><Upload size={27} /></span></div>
            <h2>{draggingFile ? 'ここにドロップ' : '画像をここにドロップ'}</h2><p>またはボタンから画像を選択</p>
            <button className="primary-button" type="button" onClick={() => fileInputRef.current?.click()}><ImageIcon size={18} /> 画像を選ぶ</button>
            <span className="file-note">JPG・PNG・WebP / 端末内で処理</span>{message && <div className="error-message" role="alert">{message}</div>}
          </div>
        ) : (
          <div className="editor-layout">
            <div className="canvas-panel">
              <div className="canvas-toolbar"><div><span className="status-dot" /> 選択モード</div><span><MousePointer2 size={14} /> ドラッグして範囲を追加</span></div>
              <div className="canvas-stage">
                <canvas ref={canvasRef} onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={finishSelection}
                  onPointerCancel={() => { setDragStart(null); setDraft(null) }} aria-label="ドラッグしてモザイク範囲を選択" tabIndex={0} />
                {rects.length === 0 && !draft && <div className="canvas-hint"><WandSparkles size={19} /> 隠したい場所をドラッグ</div>}
              </div>
              <div className="image-meta"><span>{file?.name}</span><span>{dimensions}</span></div>
            </div>
            <aside className="controls-panel">
              <div className="control-section">
                <div className="section-title"><span>01</span><div><b>モザイクの粗さ</b><small>ブロックの大きさを調整</small></div></div>
                <div className="range-row"><span>細かい</span><b>{pixelSize}px</b><span>粗い</span></div>
                <input className="range" type="range" min="6" max="60" value={pixelSize} style={{ '--range-value': `${((pixelSize - 6) / 54) * 100}%` } as React.CSSProperties} onChange={(event) => setPixelSize(Number(event.target.value))} aria-label="モザイクの粗さ" />
              </div>
              <div className="control-section">
                <div className="section-title"><span>02</span><div><b>範囲を編集</b><small>{rects.length}か所にモザイクを適用中</small></div></div>
                <div className="edit-actions"><button type="button" onClick={() => setRects((current) => current.slice(0, -1))} disabled={rects.length === 0}><Undo2 size={17} /> 1つ戻す</button><button type="button" onClick={() => setRects([])} disabled={rects.length === 0}><RotateCcw size={17} /> 全て解除</button></div>
              </div>
              <div className="control-section export-section">
                <div className="section-title"><span>03</span><div><b>保存設定</b><small>元の解像度で書き出します</small></div></div>
                <div className="format-toggle" aria-label="保存形式"><button type="button" className={exportType === 'image/png' ? 'active' : ''} onClick={() => setExportType('image/png')}><Check size={14} /> PNG</button><button type="button" className={exportType === 'image/jpeg' ? 'active' : ''} onClick={() => setExportType('image/jpeg')}><Check size={14} /> JPG</button></div>
                {exportType === 'image/jpeg' && <label className="quality-row">画質 <b>{quality}%</b><input type="range" min="60" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label>}
                <button className="download-button" type="button" onClick={download} disabled={rects.length === 0 || isSaving}><Download size={19} /> {isSaving ? '保存用画像を作成中…' : 'モザイク画像を保存'}</button>
                {message && <div className="save-message" role="status">{message}</div>}
              </div>
              <button className="remove-button" type="button" onClick={removeImage}><Trash2 size={16} /> 別の画像を選ぶ</button>
            </aside>
          </div>
        )}
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => acceptFile(event.target.files?.[0])} />
      </section>
      <section className="trust-row" aria-label="サービスの特徴">
        <div><span><LockKeyhole size={19} /></span><p><strong>完全プライベート</strong><small>画像は外部に送信されません</small></p></div><i />
        <div><span><WandSparkles size={19} /></span><p><strong>すぐに使える</strong><small>登録もインストールも不要</small></p></div><i />
        <div><span><ImageIcon size={19} /></span><p><strong>元画質のまま</strong><small>解像度を保って保存</small></p></div>
      </section>
      <footer><span>© 2026 Mosaic Studio</span><span>画像データは保存・収集されません</span></footer>
    </main>
  )
}
export default App
