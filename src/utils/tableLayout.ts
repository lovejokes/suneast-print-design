/**
 * 假表格布局：聚行 → 首行定表宽 → 各行末格拉满 → 边框去重（首行留 top、首列留 left）
 */

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

export interface TableLayoutCellMeta {
  rowIndex: number
  colIndex: number
}

export const TABLE_LAYOUT_BORDER_WIDTH = 0.75

const ROW_CY_TOL = 14
const OVERLAP_RATIO = 0.45
const MIN_LAST_WIDTH = 12

export type TableLayoutError = 'too-few' | 'empty-row' | 'invalid-size'

export function computeTableLayout(
  items: TableLayoutRect[],
): { ok: true; results: TableLayoutResult[] } | { ok: false; error: TableLayoutError } {
  if (items.length < 2) return { ok: false, error: 'too-few' }
  if (items.some((it) => !(it.width > 0) || !(it.height > 0))) {
    return { ok: false, error: 'invalid-size' }
  }

  const rows = clusterRows(items)
  if (rows.some((r) => r.length === 0)) return { ok: false, error: 'empty-row' }

  const firstRow = rows[0]
  const tableWidth = firstRow.reduce((s, c) => s + c.width, 0)
  if (!(tableWidth > 0)) return { ok: false, error: 'invalid-size' }

  const originLeft = Math.min(...items.map((i) => i.left))
  const originTop = Math.min(...items.map((i) => i.top))
  const tableRight = originLeft + tableWidth

  const results: TableLayoutResult[] = []
  let y = originTop

  rows.forEach((row, ri) => {
    const h = Math.max(...row.map((c) => c.height))
    const widths = fitRowWidths(
      row.map((c) => c.width),
      tableWidth,
    )
    let x = originLeft
    row.forEach((cell, ci) => {
      const isLast = ci === row.length - 1
      const w = isLast ? tableRight - x : widths[ci]
      results.push({
        id: cell.id,
        left: roundPt(x),
        top: roundPt(y),
        width: roundPt(w),
        height: roundPt(h),
        rowIndex: ri,
        colIndex: ci,
      })
      x += w
    })
    y += h
  })

  return { ok: true, results }
}

/** 写入去重边框 + 格位元数据（改内边距后可按格位恢复） */
export function writeTableCellBorderOptions(
  options: Record<string, unknown>,
  rowIndex: number,
  colIndex: number,
): void {
  options.borderRight = 'solid'
  options.borderBottom = 'solid'
  options.borderTop = rowIndex === 0 ? 'solid' : ''
  options.borderLeft = colIndex === 0 ? 'solid' : ''
  options.borderWidth = TABLE_LAYOUT_BORDER_WIDTH
  options._tableLayoutCell = { rowIndex, colIndex } as TableLayoutCellMeta
}

/**
 * 假表格去重：非首行无 borderTop，靠上行 borderBottom 拼单线。
 * 分页后若该行成为页内最上格，补回顶边，避免续页「缺顶框」。
 */
export function sealFakeTableTopBordersOnElements(els: any[]): void {
  const cells = els.filter((el) => isDedupedTableCellOptions(el?.options))
  if (cells.length < 1) return

  for (const el of cells) {
    const o = el.options
    if (!o || isSolidBorder(o.borderTop)) continue
    const top = Number(o.top) || 0
    const hasNeighborAbove = cells.some((other) => {
      if (other === el) return false
      const oo = other.options
      const ot = Number(oo?.top) || 0
      const oh = Number(oo?.height) || 0
      return Math.abs(ot + oh - top) <= 1
    })
    if (hasNeighborAbove) continue
    o.borderTop = 'solid'
    if (o.borderWidth == null || o.borderWidth === '') {
      o.borderWidth = TABLE_LAYOUT_BORDER_WIDTH
    }
  }
}

/** 预览 DOM：按页补回假表格续页首行顶边 */
export function sealFakeTableTopBordersInContainer(container: HTMLElement): void {
  container.querySelectorAll('.hiprint-printPaper').forEach((paper) => {
    const host =
      (paper.querySelector('.hiprint-printPaper-content') as HTMLElement | null) ||
      (paper as HTMLElement)
    const paperRect = (paper as HTMLElement).getBoundingClientRect()
    const entries = Array.from(host.children)
      .map((n) => {
        const el = n as HTMLElement
        if (el.classList.contains('hiprint-paperNumber')) return null
        if (el.classList.contains('hiprint_rul_wrapper')) return null
        if (el.getAttribute('data-page-footer') === '1') return null
        if (el.getAttribute('data-page-header') === '1') return null
        const target = resolveBorderTarget(el)
        if (!target) return null
        const r = el.getBoundingClientRect()
        return {
          el,
          target,
          top: r.top - paperRect.top,
          bottom: r.bottom - paperRect.top,
        }
      })
      .filter(Boolean) as Array<{
      el: HTMLElement
      target: HTMLElement
      top: number
      bottom: number
    }>
    if (entries.length < 1) return

    for (const cell of entries) {
      const cs = window.getComputedStyle(cell.target)
      if (cs.borderTopStyle === 'solid') continue
      const hasNeighborAbove = entries.some((other) => {
        if (other.el === cell.el) return false
        return Math.abs(other.bottom - cell.top) <= 2
      })
      if (hasNeighborAbove) continue
      const w = `${TABLE_LAYOUT_BORDER_WIDTH}pt`
      cell.target.style.borderTopStyle = 'solid'
      cell.target.style.borderTopWidth = w
      if (!cell.target.style.borderTopColor) {
        cell.target.style.borderTopColor =
          cell.target.style.borderBottomColor || cs.borderBottomColor || '#000'
      }
    }
  })
}

function isSolidBorder(v: unknown): boolean {
  return v === 'solid' || v === true || v === 'true'
}

/** 去重后的假表格格：至少有右+底边（应用表格布局的标准写法） */
function isDedupedTableCellOptions(o: Record<string, unknown> | null | undefined): boolean {
  if (!o) return false
  if (o._tableLayoutCell) return true
  return isSolidBorder(o.borderRight) && isSolidBorder(o.borderBottom)
}

/** 返回实际画了右+底边的节点（自身或内容区） */
function resolveBorderTarget(el: HTMLElement): HTMLElement | null {
  const cs = window.getComputedStyle(el)
  if (cs.borderRightStyle === 'solid' && cs.borderBottomStyle === 'solid') return el
  const inner = el.querySelector(
    '.hiprint-printElement-content, .hiprint-printElement-text, .hiprint-printElement-longText',
  ) as HTMLElement | null
  if (!inner) return null
  const ics = window.getComputedStyle(inner)
  if (ics.borderRightStyle === 'solid' && ics.borderBottomStyle === 'solid') return inner
  return null
}

/** submit 后按格位写回 options，并刷新设计视图 */
export function restoreTableCellBorders(el: any): boolean {
  const cell = el?.options?._tableLayoutCell as TableLayoutCellMeta | undefined
  if (!cell || typeof cell.rowIndex !== 'number' || typeof cell.colIndex !== 'number') {
    return false
  }
  writeTableCellBorderOptions(el.options, cell.rowIndex, cell.colIndex)
  try {
    el.updateDesignViewFromOptions?.()
  } catch {
    applyTableCellBorderCss(el)
  }
  return true
}

/** 直接改 DOM 边框（避免递归进 updateDesignViewFromOptions） */
export function applyTableCellBorderCss(el: any): void {
  const cell = el?.options?._tableLayoutCell as TableLayoutCellMeta | undefined
  const node = el?.designTarget?.[0] as HTMLElement | undefined
  if (!cell || !node?.style) return
  const w = `${TABLE_LAYOUT_BORDER_WIDTH}pt`
  const s = node.style
  const top = cell.rowIndex === 0
  const left = cell.colIndex === 0
  s.borderTopStyle = top ? 'solid' : ''
  s.borderTopWidth = top ? w : ''
  s.borderLeftStyle = left ? 'solid' : ''
  s.borderLeftWidth = left ? w : ''
  s.borderRightStyle = 'solid'
  s.borderBottomStyle = 'solid'
  s.borderRightWidth = w
  s.borderBottomWidth = w
}

export function isTableLayoutElementType(type: string): boolean {
  const t = String(type || '').toLowerCase()
  return t === 'text' || t === 'longtext'
}

function fitRowWidths(rawWidths: number[], tableWidth: number): number[] {
  const n = rawWidths.length
  if (n === 0) return []
  if (n === 1) return [tableWidth]

  const head = rawWidths.slice(0, n - 1)
  const headSum = head.reduce((s, w) => s + w, 0)
  const remain = tableWidth - headSum
  if (remain >= MIN_LAST_WIDTH) return [...head, remain]

  const scale = (tableWidth - MIN_LAST_WIDTH) / Math.max(headSum, 1e-6)
  const scaled = head.map((w) => w * scale)
  return [...scaled, Math.max(MIN_LAST_WIDTH, tableWidth - scaled.reduce((s, w) => s + w, 0))]
}

function clusterRows(items: TableLayoutRect[]): TableLayoutRect[][] {
  const sorted = [...items].sort(
    (a, b) => centerY(a) - centerY(b) || a.left - b.left || a.id - b.id,
  )
  const rows: TableLayoutRect[][] = []

  for (const item of sorted) {
    let bestIdx = -1
    let bestScore = -Infinity
    for (let ri = 0; ri < rows.length; ri++) {
      const score = rowMembershipScore(item, rows[ri])
      if (score > 0 && score > bestScore) {
        bestScore = score
        bestIdx = ri
      }
    }
    if (bestIdx >= 0) rows[bestIdx].push(item)
    else rows.push([item])
  }

  rows.sort(
    (a, b) =>
      median(a.map((i) => i.top)) - median(b.map((i) => i.top)) ||
      median(a.map((i) => i.left)) - median(b.map((i) => i.left)),
  )
  for (const row of rows) row.sort((a, b) => a.left - b.left || a.id - b.id)
  return rows
}

function rowMembershipScore(item: TableLayoutRect, row: TableLayoutRect[]): number {
  const itemCy = centerY(item)
  const rowCy = median(row.map(centerY))
  const rowH = median(row.map((r) => r.height))
  const cyTol = Math.max(ROW_CY_TOL, Math.min(item.height, rowH) * 0.55)
  const cyDist = Math.abs(itemCy - rowCy)

  let bestOverlap = 0
  for (const prev of row) {
    const overlap =
      Math.min(prev.top + prev.height, item.top + item.height) - Math.max(prev.top, item.top)
    if (overlap > 0) {
      bestOverlap = Math.max(bestOverlap, overlap / Math.min(prev.height, item.height))
    }
  }
  if (bestOverlap >= OVERLAP_RATIO) return 100 + bestOverlap * 10 - cyDist
  if (cyDist <= cyTol) return 50 - cyDist
  return -1
}

function centerY(r: TableLayoutRect): number {
  return r.top + r.height / 2
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function roundPt(n: number): number {
  return Math.round(n * 100) / 100
}
