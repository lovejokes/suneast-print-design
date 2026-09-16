// ===== Side effects (executed on import) =====

import './styles/global.css'
import './styles/antd-override.css'
import './hiprint/hiprint.css'
import './hiprint/print-lock.css'

import $ from 'jquery'
;(window as any).$ = $
;(window as any).jQuery = $

import { hiprint } from './hiprint/hiprint.bundle.js'
;(window as any).hiprint = hiprint

import './hiprint/hiprint.config.js'

;(window as any).autoConnect = false

// ===== Public API =====

export { default as PrintDesignerPlugin, PrintDesigner } from './plugin'

export { useHiprint } from './composables/useHiprint'
export { useTemplate } from './composables/useTemplate'

export { useDesignerStore } from './stores/designer'

export {
  renderPreviewPages,
  printPreviewPapers,
  exportPreviewPapersToPdf,
  exportPreviewPapersToImagePdf,
} from './utils/previewRender'

export {
  computeTableLayout,
  writeTableCellBorderOptions,
  isTableLayoutElementType,
  sealFakeTableTopBordersOnElements,
  sealFakeTableTopBordersInContainer,
} from './utils/tableLayout'

export { default as defaultProvider } from './providers/default-provider'
export { default as customProvider } from './providers/custom-provider'

export { default } from './plugin'