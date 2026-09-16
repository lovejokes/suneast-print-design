import type { App, Plugin, DefineComponent } from 'vue'

export declare const PrintDesigner: DefineComponent<Record<string, never>, Record<string, never>, any>

export declare const PrintDesignerPlugin: Plugin & {
  install(app: App): void
}

export default PrintDesignerPlugin

export declare function useHiprint(): any

export declare function useTemplate(): {
  exportJSON(template: any): string
  importJSON(jsonStr: string): any
  downloadJSON(template: any, filename?: string): void
  readFileAsJSON(file: File): Promise<any>
}

export declare function useDesignerStore(): any

export declare function renderPreviewPages(
  container: HTMLElement,
  template: object,
  data: object,
  paperHeight?: number,
): { pageCount: number; dispose: () => void }

export declare function printPreviewPapers(container: HTMLElement): Promise<void>

export declare function exportPreviewPapersToPdf(container: HTMLElement): Promise<void>

export declare function exportPreviewPapersToImagePdf(
  container: HTMLElement,
  filename?: string,
): Promise<void>

export interface TableLayoutRect {
  id: number
  left: number
  top: number
  width: number
  height: number
}

export interface TableLayoutResult {
  id: number
  left: number
  top: number
  width: number
  height: number
  rowIndex: number
  colIndex: number
}

export type TableLayoutError = 'too-few' | 'empty-row' | 'invalid-size'

export declare function computeTableLayout(
  items: TableLayoutRect[],
): { ok: true; results: TableLayoutResult[] } | { ok: false; error: TableLayoutError }

export declare function writeTableCellBorderOptions(
  options: Record<string, unknown>,
  rowIndex: number,
  colIndex: number,
): void

export declare function isTableLayoutElementType(type: string): boolean

export declare function sealFakeTableTopBordersOnElements(els: any[]): void

export declare function sealFakeTableTopBordersInContainer(container: HTMLElement): void

declare const defaultProvider: (hiprint: any) => () => { addElementTypes: (context: any) => void }
declare const customProvider: (hiprint: any) => () => { addElementTypes: (context: any) => void }

export { defaultProvider, customProvider }
