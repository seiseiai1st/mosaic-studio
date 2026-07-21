export type Language = 'ja' | 'zh' | 'en'

export const DEFAULT_LANGUAGE: Language = 'ja'
export const LANGUAGE_STORAGE_KEY = 'mosaic-studio-language'

export type Translation = {
  metaTitle: string
  metaDescription: string
  brandAria: string
  privacyBadge: string
  eyebrow: string
  heroTitle: string
  heroAccent: string
  heroLead: string
  heroSub: string
  editorAria: string
  dropActive: string
  dropTitle: string
  dropSub: string
  chooseImage: string
  fileNote: string
  invalidFile: string
  loadError: string
  saving: string
  shareSuccess: string
  saveCancelled: string
  saveSuccess: string
  saveUnavailable: string
  saveError: string
  selectMode: string
  dragAdd: string
  canvasAria: string
  canvasHint: string
  pixelTitle: string
  pixelSub: string
  fine: string
  coarse: string
  pixelAria: string
  editTitle: string
  rectsApplied: (count: number) => string
  undo: string
  clearAll: string
  exportTitle: string
  exportSub: string
  formatAria: string
  quality: string
  saveImage: string
  chooseAnother: string
  featuresAria: string
  privateTitle: string
  privateSub: string
  instantTitle: string
  instantSub: string
  qualityTitle: string
  qualitySub: string
  footerPrivacy: string
  languageAria: string
}

export const translations: Record<Language, Translation> = {
  ja: {
    metaTitle: 'Mosaic Studio — ブラウザだけで簡単モザイク加工',
    metaDescription: '画像をアップロードせず、ブラウザだけで手軽にモザイク加工できる無料ツール。',
    brandAria: 'Mosaic Studio ホーム',
    privacyBadge: '画像はアップロードされません',
    eyebrow: 'かんたん・安全・無料',
    heroTitle: '隠したいところを、',
    heroAccent: 'サッとモザイク。',
    heroLead: '画像を選んで、隠したい範囲をなぞるだけ。',
    heroSub: 'すべての処理がブラウザ内で完結します。',
    editorAria: '画像モザイク編集ツール',
    dropActive: 'ここにドロップ',
    dropTitle: '画像をここにドロップ',
    dropSub: 'またはボタンから画像を選択',
    chooseImage: '画像を選ぶ',
    fileNote: 'JPG・PNG・WebP / 端末内で処理',
    invalidFile: 'JPG・PNG・WebP画像を選択してください。',
    loadError: '画像を読み込めませんでした。別の画像をお試しください。',
    saving: '保存用画像を作成中…',
    shareSuccess: '共有メニューから画像を保存できます。',
    saveCancelled: '保存をキャンセルしました。',
    saveSuccess: '画像を保存しました。ダウンロード一覧をご確認ください。',
    saveUnavailable: '画像の保存機能を利用できません。',
    saveError: '画像を保存できませんでした。別のブラウザでお試しください。',
    selectMode: '選択モード',
    dragAdd: 'ドラッグして範囲を追加',
    canvasAria: 'ドラッグしてモザイク範囲を選択',
    canvasHint: '隠したい場所をドラッグ',
    pixelTitle: 'モザイクの粗さ',
    pixelSub: 'ブロックの大きさを調整',
    fine: '細かい',
    coarse: '粗い',
    pixelAria: 'モザイクの粗さ',
    editTitle: '範囲を編集',
    rectsApplied: (count) => `${count}か所にモザイクを適用中`,
    undo: '1つ戻す',
    clearAll: '全て解除',
    exportTitle: '保存設定',
    exportSub: '元の解像度で書き出します',
    formatAria: '保存形式',
    quality: '画質',
    saveImage: 'モザイク画像を保存',
    chooseAnother: '別の画像を選ぶ',
    featuresAria: 'サービスの特徴',
    privateTitle: '完全プライベート',
    privateSub: '画像は外部に送信されません',
    instantTitle: 'すぐに使える',
    instantSub: '登録もインストールも不要',
    qualityTitle: '元画質のまま',
    qualitySub: '解像度を保って保存',
    footerPrivacy: '画像データは保存・収集されません',
    languageAria: '表示言語',
  },
  zh: {
    metaTitle: 'Mosaic Studio — 浏览器内轻松添加马赛克',
    metaDescription: '无需上传图片，直接在浏览器中免费、轻松地添加马赛克。',
    brandAria: 'Mosaic Studio 首页',
    privacyBadge: '图片不会上传',
    eyebrow: '简单・安全・免费',
    heroTitle: '隐藏不想展示的地方，',
    heroAccent: '快速打码。',
    heroLead: '选择图片，拖动框选需要隐藏的区域。',
    heroSub: '所有处理均在浏览器中完成。',
    editorAria: '图片马赛克编辑工具',
    dropActive: '松开即可添加',
    dropTitle: '将图片拖放到这里',
    dropSub: '或点击按钮选择图片',
    chooseImage: '选择图片',
    fileNote: 'JPG・PNG・WebP / 仅在本机处理',
    invalidFile: '请选择JPG、PNG或WebP图片。',
    loadError: '无法读取图片，请尝试其他图片。',
    saving: '正在生成保存图片…',
    shareSuccess: '可通过分享菜单保存图片。',
    saveCancelled: '已取消保存。',
    saveSuccess: '图片已保存，请查看下载列表。',
    saveUnavailable: '当前无法使用图片保存功能。',
    saveError: '无法保存图片，请尝试其他浏览器。',
    selectMode: '选择模式',
    dragAdd: '拖动添加区域',
    canvasAria: '拖动选择马赛克区域',
    canvasHint: '拖动框选需要隐藏的位置',
    pixelTitle: '马赛克粗细',
    pixelSub: '调整像素块大小',
    fine: '细腻',
    coarse: '粗糙',
    pixelAria: '马赛克粗细',
    editTitle: '编辑区域',
    rectsApplied: (count) => `已对 ${count} 处应用马赛克`,
    undo: '撤销一步',
    clearAll: '全部清除',
    exportTitle: '保存设置',
    exportSub: '按原始分辨率导出',
    formatAria: '保存格式',
    quality: '画质',
    saveImage: '保存马赛克图片',
    chooseAnother: '选择其他图片',
    featuresAria: '服务特点',
    privateTitle: '完全私密',
    privateSub: '图片不会发送到外部',
    instantTitle: '立即使用',
    instantSub: '无需注册或安装',
    qualityTitle: '保留原画质',
    qualitySub: '以原始分辨率保存',
    footerPrivacy: '图片数据不会被保存或收集',
    languageAria: '显示语言',
  },
  en: {
    metaTitle: 'Mosaic Studio — Private in-browser image mosaics',
    metaDescription: 'Add mosaics to images quickly and privately, entirely in your browser.',
    brandAria: 'Mosaic Studio home',
    privacyBadge: 'Images are never uploaded',
    eyebrow: 'Easy・Private・Free',
    heroTitle: 'Hide what matters,',
    heroAccent: 'in a snap.',
    heroLead: 'Choose an image and drag over anything you want to conceal.',
    heroSub: 'All processing happens in your browser.',
    editorAria: 'Image mosaic editor',
    dropActive: 'Drop it here',
    dropTitle: 'Drop your image here',
    dropSub: 'or choose one from your device',
    chooseImage: 'Choose image',
    fileNote: 'JPG・PNG・WebP / Processed on your device',
    invalidFile: 'Please choose a JPG, PNG, or WebP image.',
    loadError: 'We could not read that image. Please try another one.',
    saving: 'Preparing your image…',
    shareSuccess: 'You can save the image from the share menu.',
    saveCancelled: 'Save cancelled.',
    saveSuccess: 'Image saved. Check your downloads.',
    saveUnavailable: 'Image saving is not available in this browser.',
    saveError: 'We could not save the image. Please try another browser.',
    selectMode: 'Selection mode',
    dragAdd: 'Drag to add an area',
    canvasAria: 'Drag to select an area for mosaicing',
    canvasHint: 'Drag over anything to hide',
    pixelTitle: 'Mosaic strength',
    pixelSub: 'Adjust the block size',
    fine: 'Fine',
    coarse: 'Coarse',
    pixelAria: 'Mosaic strength',
    editTitle: 'Edit areas',
    rectsApplied: (count) => `${count} ${count === 1 ? 'area' : 'areas'} mosaiced`,
    undo: 'Undo last',
    clearAll: 'Clear all',
    exportTitle: 'Export settings',
    exportSub: 'Export at the original resolution',
    formatAria: 'Export format',
    quality: 'Quality',
    saveImage: 'Save mosaic image',
    chooseAnother: 'Choose another image',
    featuresAria: 'Service features',
    privateTitle: 'Completely private',
    privateSub: 'Your image never leaves your device',
    instantTitle: 'Ready instantly',
    instantSub: 'No sign-up or installation',
    qualityTitle: 'Original quality',
    qualitySub: 'Saved at full resolution',
    footerPrivacy: 'Image data is never stored or collected',
    languageAria: 'Display language',
  },
}

export function getInitialLanguage(storedValue?: string | null): Language {
  return storedValue === 'zh' || storedValue === 'en' || storedValue === 'ja' ? storedValue : DEFAULT_LANGUAGE
}
