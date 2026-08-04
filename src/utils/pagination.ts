/**
 * 文本跨页拆分 —— 直接基于 print2 项目的成熟分页算法，适配 hiprint getHtml() 输出。
 *
 * 阶段 0：预处理 —— 给 hiprint 的绝对定位子元素包裹 .element-wrapper 并写入 data-* 标记。
 * 阶段 1：流式元素拆分 —— 文本（auto-height）逐页二分切分。
 * 阶段 2：固定元素同步 —— 根据流式元素的最终位置重排图片等固定元素。
 * 阶段 3：清理 —— 去除 wrapper、恢复原始 DOM 结构。
 */

/* ──────────── 类型 & 常量 ──────────── */

const MAX_PASSES = 60

/* ──────────── 基础 DOM 工具 ──────────── */

function getPapers(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll('.hiprint-printPaper'),
  ) as HTMLElement[]
}

function elHeight(el: HTMLElement): number {
  return el.getBoundingClientRect().height
}

/* ──────────── data-* 属性读写 ──────────── */

function parseAttr(el: HTMLElement, attr: string, fallback = 0): number {
  const v = parseFloat(el.getAttribute(attr) || '')
  return Number.isFinite(v) ? v : fallback
}

function getOriginalTop(wrapper: HTMLElement): number {
  return parseAttr(wrapper, 'data-original-top', parseFloat(wrapper.style.top || '') || 0)
}

function getOriginalHeight(wrapper: HTMLElement): number {
  const stored = parseAttr(wrapper, 'data-original-height', -1)
  if (stored >= 0) return stored
  return elHeight(wrapper)
}

function getOriginPage(wrapper: HTMLElement): number {
  return parseAttr(wrapper, 'data-origin-page-index', 0)
}

function compareByOriginalTop(a: HTMLElement, b: HTMLElement): number {
  const d = getOriginalTop(a) - getOriginalTop(b)
  if (Math.abs(d) > 0.01) return d
  const sa = a.getAttribute('data-wrapper-seq') || ''
  const sb = b.getAttribute('data-wrapper-seq') || ''
  const seqDelta = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' })
  if (seqDelta !== 0) return seqDelta
  const fa = a.getAttribute('data-flow-id') || ''
  const fb = b.getAttribute('data-flow-id') || ''
  return fa.localeCompare(fb, undefined, { numeric: true, sensitivity: 'base' })
}

/* ──────────── 缩放感知坐标转换（参考 print2） ──────────── */

function getPageScaleY(pageRect: DOMRect, pageHeight: number): number {
  if (pageHeight <= 0 || pageRect.height <= 0) return 1
  return pageRect.height / pageHeight
}

function pageYToViewportY(pageRect: DOMRect, pageY: number, pageHeight: number): number {
  return pageRect.top + pageY * getPageScaleY(pageRect, pageHeight)
}

function viewportYToPageY(pageRect: DOMRect, viewportY: number, pageHeight: number): number {
  return (viewportY - pageRect.top) / getPageScaleY(pageRect, pageHeight)
}

/* ──────────── 归一化切分点 ──────────── */

function normalizeSplitIndex(text: string, candidate: number): number {
  if (candidate <= 0 || candidate >= text.length) return candidate

  const nearNewLine = text.lastIndexOf('\n', candidate - 1)
  if (nearNewLine >= Math.max(0, candidate - 120)) {
    return nearNewLine + 1
  }

  const nearSpace = Math.max(
    text.lastIndexOf(' ', candidate - 1),
    text.lastIndexOf('\t', candidate - 1),
  )
  if (nearSpace >= Math.max(0, candidate - 40)) {
    return nearSpace + 1
  }

  return candidate
}

/* ──────────── 二分查找文本切分点（与 print2 完全一致） ──────────── */

function findAutoHeightSplitIndex(
  textEl: HTMLElement,
  fullText: string,
  limitBottom: number,
): number {
  if (!fullText) return 0

  let low = 1
  let high = fullText.length
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    textEl.textContent = fullText.slice(0, mid)
    const bottom = textEl.getBoundingClientRect().bottom
    if (bottom <= limitBottom + 1) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const adjusted = normalizeSplitIndex(fullText, best)
  if (adjusted > 0 && adjusted < fullText.length && adjusted !== best) {
    textEl.textContent = fullText.slice(0, adjusted)
    if (textEl.getBoundingClientRect().bottom <= limitBottom + 1) {
      best = adjusted
    }
  }

  textEl.textContent = fullText
  return best
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* 阶段 0：预处理 —— 包裹 hiprint 元素并标记 data-* 属性                   */
/* ═══════════════════════════════════════════════════════════════════════ */

function isHiprintTextElement(el: HTMLElement): boolean {
  if (el.querySelector('img, table, svg, canvas')) return false
  const text = (el.textContent || '').trim()
  return text.length > 0
}

/** 获取 paper 中需要处理的子元素所在容器。
 *  hiprint 的 DOM 结构：hiprint-printPaper > hiprint-printPaper-content > 实际元素。
 *  如果 content div 存在且包含绝对定位子元素，优先使用其 children；
 *  否则回退到 paper.children（兼容其他可能的 DOM 变体）。 */
function getElementContainer(paper: HTMLElement): HTMLElement {
  const contentDiv = paper.querySelector('.hiprint-printPaper-content') as HTMLElement | null
  if (contentDiv) {
    // 检查 content div 中是否有绝对定位子元素
    const absChildren = Array.from(contentDiv.children).filter((c) => {
      const pos = window.getComputedStyle(c).position || ''
      return pos === 'absolute' || pos === 'fixed'
    })
    if (absChildren.length > 0) return contentDiv
  }
  return paper
}

/** 获取 paper 中用于追加子元素的目标容器。
 *  若 paper 内存在 .hiprint-printPaper-content，优先追加到其中；
 *  否则直接追加到 paper 上。保证 DOM 层级一致性。 */
function getPaperAppendTarget(paper: HTMLElement): HTMLElement {
  const contentDiv = paper.querySelector('.hiprint-printPaper-content') as HTMLElement | null
  return contentDiv || paper
}

/** 解析 wrapper 所属的 paper（hiprint 元素挂在 printPaper-content 下，不能用 parentElement） */
function resolvePaper(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  if (el.classList.contains('hiprint-printPaper')) return el
  return el.closest('.hiprint-printPaper') as HTMLElement | null
}

function cssLengthToPx(raw: string): number {
  if (!raw) return 0
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return 0
  const hinnn = (window as any).hinnn
  if (raw.includes('pt') && hinnn?.pt?.toPx) return hinnn.pt.toPx(n)
  if (raw.includes('mm') && hinnn?.mm?.toPx) return hinnn.mm.toPx(n)
  return n
}

function preprocessHiprintDOM(container: HTMLElement): void {
  const papers = getPapers(container)

  papers.forEach((paper, pageIdx) => {
    const elementContainer = getElementContainer(paper)
    const children = Array.from(elementContainer.children) as HTMLElement[]
    const toWrap: { el: HTMLElement; top: number; height: number }[] = []

    // 纸张高度优先用样式换算，避免弹窗开场动画 transform 污染 getBoundingClientRect
    const pageHeight =
      cssLengthToPx(paper.style.height) || paper.getBoundingClientRect().height

    for (const child of children) {
      if (child.hasAttribute('data-print-wrapper')) continue
      if (child.classList.contains('hiprint_rul_wrapper')) continue
      if (child.classList.contains('hiprint-paperNumber')) continue
      // 页尾固定在底部，不参与流式包裹/改高
      if (child.getAttribute('data-page-footer') === '1') continue
      // 页眉固定在顶部，不参与流式包裹/搬运
      if (child.getAttribute('data-page-header') === '1') continue
      // 浮动叠层：不参与分页包裹/串行占位（由 snapFloatOverlays 贴齐）
      if (child.getAttribute('data-page-overlay') === '1') continue
      const computed = window.getComputedStyle(child)
      const pos = computed.position || ''
      if (pos !== 'absolute' && pos !== 'fixed') continue

      const z = parseInt(computed.zIndex || '0', 10)
      if (
        child.classList.contains('hiprint-printElement-image') &&
        Number.isFinite(z) &&
        z > 0
      ) {
        child.setAttribute('data-page-overlay', '1')
        continue
      }

      const top =
        cssLengthToPx(child.style.top) ||
        child.getBoundingClientRect().top - paper.getBoundingClientRect().top
      const h =
        cssLengthToPx(child.style.height) || child.getBoundingClientRect().height
      // 不再按「距页底比例」跳过包裹：正文末行（传真/地址等）常落在该带内，
      // 跳过后会保留 pt 而上方元素被改成 px，出现大块空白。
      // 真正的重复页尾已有 data-page-footer，上面已 continue。
      toWrap.push({ el: child, top, height: h })
    }

    toWrap.sort((a, b) => a.top - b.top)

    toWrap.forEach(({ el, top, height }, wrapperIdx) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'element-wrapper'
      wrapper.setAttribute('data-print-wrapper', 'true')
      wrapper.setAttribute('data-original-top', `${top}`)
      wrapper.setAttribute('data-original-height', `${height}`)
      wrapper.setAttribute('data-origin-page-index', `${pageIdx}`)
      wrapper.setAttribute('data-wrapper-seq', `${pageIdx}-${wrapperIdx}`)

      // 保留 hiprint 原始 pt 定位，避免 modal 动画期间 getBoundingClientRect
      // 把缩放后的 px 写死，导致预览相对设计偏左/偏上
      const origLeft = el.style.left || ''
      const origTop = el.style.top || ''
      const origWidth = el.style.width || ''
      const origHeight = el.style.height || ''
      wrapper.setAttribute('data-orig-left', origLeft)
      wrapper.setAttribute('data-orig-width', origWidth)
      wrapper.setAttribute('data-orig-height', origHeight)

      const leftPx = cssLengthToPx(origLeft)
      const topPx = cssLengthToPx(origTop) || top
      const widthPx = cssLengthToPx(origWidth)
      const heightPx = cssLengthToPx(origHeight) || height

      wrapper.style.position = 'absolute'
      wrapper.style.top = `${topPx}px`
      // left/width 尽量保留原单位（pt）；仅在缺失时回退 px
      wrapper.style.left = origLeft || `${leftPx}px`
      wrapper.style.width = origWidth || (widthPx ? `${widthPx}px` : '')
      wrapper.style.height = origHeight || `${heightPx}px`

      el.style.position = ''
      el.style.top = ''
      el.style.left = ''
      el.style.width = '100%'
      el.style.height = '100%'

      // wrapper 插入到 elementContainer 中（而非 paper），保持 DOM 层级一致
      elementContainer.insertBefore(wrapper, el)
      wrapper.appendChild(el)

      const isText = isHiprintTextElement(el)
      if (isText) {
        wrapper.setAttribute('data-flow-id', `${pageIdx}-${wrapperIdx}`)
        wrapper.setAttribute('data-flow-kind', 'auto-height')

        const contentEl = el.querySelector(
          '.hiprint-printElement-content',
        ) as HTMLElement | null
        if (contentEl) {
          contentEl.setAttribute('data-text-content', 'true')
        }

        // 文本域最低高度：随元素带到 wrapper，避免 height:auto 后占位塌缩
        const lHeightAttr =
          el.getAttribute('data-l-height') ||
          (el.querySelector('[data-l-height]') as HTMLElement | null)?.getAttribute(
            'data-l-height',
          )
        if (lHeightAttr) {
          wrapper.setAttribute('data-l-height', lHeightAttr)
          const minH = parseFloat(lHeightAttr)
          if (Number.isFinite(minH) && minH > 0) {
            wrapper.style.minHeight = `${minH}pt`
            el.style.minHeight = `${minH}pt`
          }
        }
      }
    })
  })
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* 阶段 1 & 2：流式拆分 + 固定元素同步（基于 print2 成熟算法）             */
/* ═══════════════════════════════════════════════════════════════════════ */

function resolveTextContentEl(wrapper: HTMLElement): HTMLElement | null {
  return wrapper.querySelector('[data-text-content="true"]') as HTMLElement | null
}

function getFirstTextLineRect(element: HTMLElement): DOMRect | null {
  const walker = element.ownerDocument.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */)
  let textNode = walker.nextNode() as Text | null
  while (textNode && !textNode.textContent?.trim()) {
    textNode = walker.nextNode() as Text | null
  }
  if (!textNode || !textNode.textContent) return null

  const range = element.ownerDocument.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, textNode.textContent.length)
  const rect = Array.from(range.getClientRects())[0] || null
  range.detach()
  return rect
}

function applyFirstLineAlignment(
  wrapper: HTMLElement,
  textEl: HTMLElement,
  originalContentHeight: number,
): void {
  if (originalContentHeight <= 0) return

  const computed = window.getComputedStyle(textEl)
  const jc = computed.justifyContent
  const isMiddle = jc === 'center'
  const isBottom = jc === 'flex-end' || jc === 'end'
  if (!isMiddle && !isBottom) return

  const firstLineRect = getFirstTextLineRect(textEl)
  if (!firstLineRect || firstLineRect.height <= 0) return

  const wrapperRect = wrapper.getBoundingClientRect()
  const currentOffset = firstLineRect.top - wrapperRect.top
  const targetOffset = isMiddle
    ? Math.max(0, (originalContentHeight - firstLineRect.height) / 2)
    : Math.max(0, originalContentHeight - firstLineRect.height)
  const delta = targetOffset - currentOffset
  if (delta <= 0.1) return

  const curPad = parseFloat(computed.paddingTop || '0') || 0
  textEl.style.paddingTop = `${curPad + delta}px`
  textEl.setAttribute('data-align-offset-y', `${delta}`)
}

function clearFirstLineAlignment(textEl: HTMLElement): void {
  const raw = textEl.getAttribute('data-align-offset-y')
  const offset = raw ? parseFloat(raw) : 0
  textEl.removeAttribute('data-align-offset-y')
  if (!Number.isFinite(offset) || offset <= 0) return
  const curPad = parseFloat(textEl.style.paddingTop || '0') || 0
  textEl.style.paddingTop = `${Math.max(0, curPad - offset)}px`
}

/* ── 页面管理（参考 print2 的 createFlowOverflowPage） ── */

/**
 * 将各 panel 下的 paper 提升为 container 的直接子元素。
 * hiprint 多面板输出为 panel > paper[]，溢出页留在 panel 内会把后续 panel
 * 整块顶下去造成空白错位；拉平后 papers 成为连续兄弟节点，与 flex 预览布局一致。
 */
function flattenPrintPapers(container: HTMLElement): void {
  const papers = getPapers(container)
  if (papers.length === 0) return

  papers.forEach((paper, idx) => {
    const panel = paper.closest('.hiprint-printPanel') as HTMLElement | null
    if (panel) {
      const matched = panel.className.match(/panel-index-(\d+)/)
      if (matched) {
        paper.setAttribute('data-source-panel', matched[1])
      } else if (!paper.hasAttribute('data-source-panel')) {
        paper.setAttribute('data-source-panel', String(idx))
      }
    }
    if (paper.parentElement !== container) {
      container.appendChild(paper)
    }
  })

  // 保留 panel 内 hiprint 注入的 @page 等 style，再删空壳
  container.querySelectorAll('.hiprint-printPanel, .hiprint-printTemplate').forEach((el) => {
    if (el.querySelectorAll('.hiprint-printPaper').length === 0) {
      Array.from(el.querySelectorAll('style')).forEach((style) => {
        container.insertBefore(style, container.firstChild)
      })
      el.remove()
    }
  })
}

/** 某 paper 是否为 hiprint 溢出页（同一 source-panel 的第 2+ 张） */
function isOverflowPaper(paper: HTMLElement, papers: HTMLElement[]): boolean {
  const src = paper.getAttribute('data-source-panel')
  if (src == null) return false
  const first = papers.find((p) => p.getAttribute('data-source-panel') === src)
  return !!first && first !== paper
}

function getElemTopInPaper(el: HTMLElement, paper: HTMLElement): number {
  return el.getBoundingClientRect().top - paper.getBoundingClientRect().top
}

/** 仅识别真正的页脚/页码，勿用「距页底比例」把正文末行（传真/地址）误判成页脚 */
function isFooterBandEl(el: HTMLElement, _paper: HTMLElement, _pageHeight: number): boolean {
  if (
    el.classList.contains('hiprint-paperNumber') ||
    !!el.querySelector?.('.hiprint-paperNumber')
  ) {
    return true
  }
  if (el.getAttribute('data-page-footer') === '1') return true
  if (el.querySelector?.('[data-page-footer="1"]')) return true
  // pinPageFooters 用 bottom 钉底；属性偶发丢失时仍勿当正文占位
  const bottom = el.style?.bottom
  if (bottom && bottom !== 'auto' && bottom !== '') return true
  const inner = el.querySelector?.('.hiprint-printElement, [style*="bottom"]') as HTMLElement | null
  if (inner?.style?.bottom && inner.style.bottom !== 'auto') return true
  return false
}

/** 页眉元素：固定在纸面顶部，不参与正文流式分页/搬运 */
function isPageHeaderEl(el: HTMLElement): boolean {
  if (el.getAttribute('data-page-header') === '1') return true
  if (el.querySelector?.('[data-page-header="1"]')) return true
  return false
}

/** 页脚区起始 top（无页脚时为 pageHeight，并避让下偏移带） */
function getFooterTop(paper: HTMLElement, pageHeight: number): number {
  let footerTop = pageHeight
  const host = getElementContainer(paper)
  const candidates = [
    ...Array.from(paper.querySelectorAll('[data-print-wrapper]')),
    ...Array.from(host.children),
  ] as HTMLElement[]

  candidates.forEach((el) => {
    if (el.classList.contains('hiprint-paperNumber')) return
    if (el.classList.contains('hiprint_rul_wrapper')) return
    const isFooter =
      el.getAttribute('data-page-footer') === '1' ||
      !!el.querySelector?.('[data-page-footer="1"]') ||
      (el.style?.bottom && el.style.bottom !== 'auto' && el.style.bottom !== '')
    if (!isFooter) return
    const top = getElemTopInPaper(el, paper)
    footerTop = Math.min(footerTop, top)
  })

  // 无页尾元素时仍扣下偏移，避免回填/占位把正文铺进下边距
  const rawBo =
    paper.getAttribute('data-bottom-offset-pt') ??
    (window as any).HIPRINT_CONFIG?.panel?.default?.bottomOffset
  const bottomOffsetPt = Number(rawBo)
  if (Number.isFinite(bottomOffsetPt) && bottomOffsetPt > 0) {
    const hinnn = (window as any).hinnn
    const bottomOffsetPx = hinnn?.pt?.toPx
      ? hinnn.pt.toPx(bottomOffsetPt)
      : bottomOffsetPt * (96 / 72)
    footerTop = Math.min(footerTop, pageHeight - bottomOffsetPx)
  }
  return footerTop
}

/** 正文内容底边（排除页脚带、页码与浮动叠层） */
function getBodyContentBottom(paper: HTMLElement, pageHeight: number): number {
  const paperRect = paper.getBoundingClientRect()
  let maxBottom = 0

  const wrappers = Array.from(
    paper.querySelectorAll('[data-print-wrapper]'),
  ) as HTMLElement[]
  const bodyWrappers = wrappers.filter((w) => {
    if (w.getAttribute('data-repeat-per-page') === 'true') return false
    if (w.getAttribute('data-page-overlay') === '1') return false
    if (resolvePaper(w) !== paper) return false
    if (isPageHeaderEl(w)) return false
    if (isFooterBandEl(w, paper, pageHeight)) return false
    if (w.querySelector?.('[data-page-overlay="1"]')) return false
    return true
  })

  if (bodyWrappers.length > 0) {
    bodyWrappers.forEach((w) => {
      const r = w.getBoundingClientRect()
      maxBottom = Math.max(maxBottom, r.bottom - paperRect.top)
    })
    return maxBottom
  }

  const host = getElementContainer(paper)
  Array.from(host.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.classList.contains('hiprint-paperNumber')) return
    if (el.classList.contains('hiprint_rul_wrapper')) return
    if (el.hasAttribute('data-print-wrapper')) return
    if (el.getAttribute('data-page-overlay') === '1') return
    if (isPageHeaderEl(el)) return
    const cs = window.getComputedStyle(el)
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return
    if (isFooterBandEl(el, paper, pageHeight)) return
    // 浮动图：不参与正文占位高度
    if (
      el.classList.contains('hiprint-printElement-image') &&
      parseInt(cs.zIndex || '0', 10) > 0
    ) {
      return
    }
    const r = el.getBoundingClientRect()
    maxBottom = Math.max(maxBottom, r.bottom - paperRect.top)
  })
  return maxBottom
}

function getMovableWrappers(paper: HTMLElement, pageHeight: number): HTMLElement[] {
  return (
    Array.from(paper.querySelectorAll('[data-print-wrapper]')) as HTMLElement[]
  )
    .filter((w) => {
      if (w.getAttribute('data-repeat-per-page') === 'true') return false
      if (resolvePaper(w) !== paper) return false
      // 页眉 / 页脚不参与上移
      if (isPageHeaderEl(w)) return false
      if (isFooterBandEl(w, paper, pageHeight)) return false
      return true
    })
    .sort(compareByOriginalTop)
}

function paperHasMovableContent(paper: HTMLElement, pageHeight: number): boolean {
  if (getMovableWrappers(paper, pageHeight).length > 0) return true
  const host = getElementContainer(paper)
  return Array.from(host.children).some((child) => {
    const el = child as HTMLElement
    if (el.classList.contains('hiprint-paperNumber')) return false
    if (el.classList.contains('hiprint_rul_wrapper')) return false
    if (el.hasAttribute('data-print-wrapper')) return false
    if (isPageHeaderEl(el)) return false
    // 浮动叠层不视为正文残留：正文搬空后仅剩浮动层（如公章）时页应判为可删
    if (el.getAttribute('data-page-overlay') === '1') return false
    const cs = window.getComputedStyle(el)
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return false
    if (isFooterBandEl(el, paper, pageHeight)) return false
    return true
  })
}

/**
 * 正文被部分搬走后，把剩余可移动元素整体上移，去掉页面前部大块空白。
 * （例如表格撑高产生溢出页，再从下一页抽内容回填后，源页顶部会留下空洞。）
 * 注意：不要对设计首页做无差别上移，否则会吃掉设计稿顶部故意留白。
 */
function compactPaperContentUp(paper: HTMLElement, pageHeight: number): void {
  const wrappers = getMovableWrappers(paper, pageHeight)
  if (wrappers.length === 0) return

  const minTop = Math.min(...wrappers.map((w) => getOriginalTop(w)))
  // 仅当顶部空洞明显时才收（避免把设计页正常上边距压到贴顶）
  if (minTop < pageHeight * 0.08) return

  // 续页正文起排：优先用面板上偏移（pt→px），否则回退约 20px
  const hinnn = (window as any).hinnn
  const topOffPt = Number(paper.getAttribute('data-top-offset-pt') || '')
  let contentStart =
    Number.isFinite(topOffPt) && topOffPt > 0
      ? hinnn?.pt?.toPx?.(topOffPt) ?? topOffPt * (96 / 72)
      : 20
  const paperRect = paper.getBoundingClientRect()
  const host = getElementContainer(paper)
  Array.from(host.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.hasAttribute('data-print-wrapper')) return
    if (el.classList.contains('hiprint-paperNumber')) return
    if (el.classList.contains('hiprint_rul_wrapper')) return
    if (isFooterBandEl(el, paper, pageHeight)) return
    const cs = window.getComputedStyle(el)
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return
    const top = el.getBoundingClientRect().top - paperRect.top
    const bottom = el.getBoundingClientRect().bottom - paperRect.top
    if (top < minTop && top < pageHeight * 0.3) {
      contentStart = Math.max(contentStart, bottom + 4)
    }
  })

  const shift = minTop - contentStart
  if (shift <= 1) return

  for (const w of wrappers) {
    const newTop = getOriginalTop(w) - shift
    w.style.setProperty('top', `${newTop}px`, 'important')
    w.setAttribute('data-original-top', `${newTop}`)
  }
}

/**
 * 把后续页正文上移填入当前页页脚之上的空白。
 * 不仅处理 hiprint「溢出页」，也处理设计拆页首页底部大块留白
 * （例如签名区「传真/户名」后还有空位，但「地址/账号」被分到了下一页）。
 * 多轮回填：前一轮腾出空位后，后一轮继续拉（如先拉「五」再拉「地址」）。
 * 页眉/页脚/浮动叠层不参与搬运。
 */
function compactOverflowPageBlanks(container: HTMLElement, pageHeight: number): void {
  const initialPapers = getPapers(container)
  if (initialPapers.length < 2) return

  preprocessHiprintDOM(container)

  const GAP = 4
  /** 与设计稿中常见段落间距接近（如 四.正文底→五.标题 ≈ 23.5pt） */
  const MIN_LEAD_GAP = 24

  const pageHasFillableBlank = (paper: HTMLElement, paperIndex: number): boolean => {
    const footerTop = getFooterTop(paper, pageHeight)
    const contentBottom = getBodyContentBottom(paper, pageHeight)
    // 首页几乎空白：不回填，避免封面故意留白被后页吞掉
    if (contentBottom < pageHeight * 0.3 && paperIndex <= 0) return false
    // 完全空页不作为回填目标（由删空页处理）
    if (contentBottom < 1) return false
    // 只要还能放下一段短正文就允许尝试（残片页 / 下偏移带上方空隙）
    return contentBottom + GAP + 16 < footerTop
  }

  // 多轮：每一轮重新扫描可填页，直到不再搬运。
  // 从后往前填：先让「重要提示残片页」吃掉后面的「表单编号」，避免先抽走残片、尾页更孤立。
  for (let round = 0; round < 12; round++) {
    let roundMoved = false
    const targetEntries = getPapers(container)
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }, _, arr) => i < arr.length - 1 && pageHasFillableBlank(p, i))
      .reverse()

    for (const { p: target } of targetEntries) {
      if (!target.isConnected) continue

      while (target.isConnected) {
        const papers = getPapers(container)
        const ti = papers.indexOf(target)
        if (ti < 0 || ti >= papers.length - 1) break
        if (!pageHasFillableBlank(target, ti)) break

        const footerTop = getFooterTop(target, pageHeight)
        const contentBottom = getBodyContentBottom(target, pageHeight)
        if (contentBottom + GAP + 16 >= footerTop) break

        const srcPaper = papers[ti + 1]
        const wrappers = getMovableWrappers(srcPaper, pageHeight)
        if (wrappers.length === 0) {
          if (!paperHasMovableContent(srcPaper, pageHeight)) {
            srcPaper.remove()
            roundMoved = true
            continue
          }
          break
        }

        const blockOriginTop = getOriginalTop(wrappers[0])
        const firstH = Math.max(
          getOriginalHeight(wrappers[0]),
          wrappers[0].getBoundingClientRect().height,
        )
        // 空间紧时改用小间距，避免 longText 末行 / 表单编号因 24px 段距单独成页
        let lead = MIN_LEAD_GAP
        if (contentBottom + lead + firstH > footerTop - GAP) {
          lead = GAP
        }
        const packBase = contentBottom + lead

        // 源页几乎是残片：整页原子搬迁，避免只抽走一行、把「表单编号」留成更孤立的一页
        const srcSparse =
          getBodyContentBottom(srcPaper, pageHeight) < pageHeight * 0.35
        if (srcSparse) {
          let allFit = true
          for (const w of wrappers) {
            if (resolvePaper(w) !== srcPaper) continue
            const h = Math.max(
              getOriginalHeight(w),
              w.getBoundingClientRect().height,
            )
            const newTop =
              packBase + Math.max(0, getOriginalTop(w) - blockOriginTop)
            if (newTop + h > footerTop - GAP) {
              allFit = false
              break
            }
          }
          if (!allFit) break
        }

        let moved = false
        let full = false

        for (const w of wrappers) {
          if (resolvePaper(w) !== srcPaper) continue
          const h = Math.max(
            getOriginalHeight(w),
            w.getBoundingClientRect().height,
          )
          const newTop =
            packBase + Math.max(0, getOriginalTop(w) - blockOriginTop)
          if (newTop + h > footerTop - GAP) {
            full = true
            break
          }
          getPaperAppendTarget(target).appendChild(w)
          w.style.setProperty('top', `${newTop}px`, 'important')
          w.setAttribute('data-original-top', `${newTop}`)
          moved = true
        }

        if (!paperHasMovableContent(srcPaper, pageHeight)) {
          // 正文被搬空后若仅余浮动叠层（公章等），随正文一起迁到目标页，
          // 否则浮动层会孤悬在被删空页上，跑到文档末尾。
          const orphans = Array.from(
            srcPaper.querySelectorAll('[data-page-overlay="1"]'),
          ) as HTMLElement[]
          if (orphans.length) {
            const dest = getPaperAppendTarget(target)
            orphans.forEach((el) => {
              if (el.parentElement) el.parentElement.removeChild(el)
              dest.appendChild(el)
            })
          }
          srcPaper.remove()
        } else if (moved) {
          compactPaperContentUp(srcPaper, pageHeight)
        }

        if (moved) roundMoved = true
        if (!moved || full) break
      }
    }

    if (!roundMoved) break
  }

  // 续页顶上大块空白：整体上移贴到正文起排线（首页不碰，保留设计上边距）
  getPapers(container).forEach((paper, idx) => {
    if (idx <= 0) return
    compactPaperContentUp(paper, pageHeight)
  })

  cleanupDataAttributes(container)
}

function createOverflowPage(
  container: HTMLElement,
  papers: HTMLElement[],
  currentIdx: number,
): HTMLElement {
  const currentPaper = papers[currentIdx]
  const nextPaper = papers[currentIdx + 1]

  const newPaper = document.createElement('div')
  newPaper.className = currentPaper.className
  newPaper.style.cssText = currentPaper.style.cssText
  newPaper.style.overflow = 'hidden'
  newPaper.style.background = '#ffffff'
  newPaper.innerHTML = ''
  const sourcePanel = currentPaper.getAttribute('data-source-panel')
  if (sourcePanel != null) {
    newPaper.setAttribute('data-source-panel', sourcePanel)
  }
  const bottomOff = currentPaper.getAttribute('data-bottom-offset-pt')
  if (bottomOff != null) {
    newPaper.setAttribute('data-bottom-offset-pt', bottomOff)
  }
  const topOff = currentPaper.getAttribute('data-top-offset-pt')
  if (topOff != null) {
    newPaper.setAttribute('data-top-offset-pt', topOff)
  }

  // 检查源 paper 是否有 hiprint-printPaper-content 子元素，若有则也创建一份
  const sourceContentDiv = currentPaper.querySelector('.hiprint-printPaper-content') as HTMLElement | null
  if (sourceContentDiv) {
    const newContentDiv = document.createElement('div')
    newContentDiv.className = sourceContentDiv.className
    newContentDiv.style.cssText = sourceContentDiv.style.cssText
    newPaper.appendChild(newContentDiv)
  }

  // 按 document 顺序插入：紧挨当前页之后 / 下一页之前，避免再塞回某个 panel 内部
  if (nextPaper?.parentElement) {
    nextPaper.parentElement.insertBefore(newPaper, nextPaper)
  } else {
    const host = currentPaper.parentElement || container
    if (currentPaper.nextSibling) {
      host.insertBefore(newPaper, currentPaper.nextSibling)
    } else {
      host.appendChild(newPaper)
    }
  }

  return newPaper
}

/* ── 流式元素类型判断 ── */

function getFlowKind(wrapper: HTMLElement): string {
  return wrapper.getAttribute('data-flow-kind') || ''
}

function isProcessableFlowWrapper(wrapper: HTMLElement): boolean {
  if (wrapper.getAttribute('data-repeat-per-page') === 'true') return false

  const flowKind = getFlowKind(wrapper)
  const table = wrapper.querySelector('table') as HTMLElement | null
  const autoHeightEl = resolveTextContentEl(wrapper)
  const isAutoHeight = flowKind === 'auto-height' || (!table && !!autoHeightEl)

  if (!table && !autoHeightEl) return false
  if (table && !isAutoHeight) {
    return table.getAttribute('data-auto-paginate') === 'true'
  }
  return true
}

/* ── 轴对齐检测 ── */

function isAxisAlignedWrapper(wrapper: HTMLElement): boolean {
  let isAligned = wrapper.getAttribute('data-axis-aligned')
  if (isAligned !== null) return isAligned === 'true'

  let transform = wrapper.style.transform
  if (!transform) {
    transform = window.getComputedStyle(wrapper).transform
  }

  let result = true
  if (transform && transform !== 'none' && transform.startsWith('matrix')) {
    const values = transform.substring(7, transform.length - 1).split(',')
    if (values.length >= 4) {
      const b = parseFloat(values[1])
      const c = parseFloat(values[2])
      result = Math.abs(b) <= 0.001 && Math.abs(c) <= 0.001
    }
  }

  wrapper.setAttribute('data-axis-aligned', result ? 'true' : 'false')
  return result
}

/* ── 固定元素同步（参考 print2 的 syncElementsBelowTables） ── */

interface FixedBand {
  originalTop: number
  originalBottom: number
  height: number
}

function buildFixedBands(
  papers: HTMLElement[],
  headerHeight: number,
  footerHeight: number,
  pageHeight: number,
  marginTop: number,
  marginBottom: number,
): Map<HTMLElement, FixedBand> {
  const wrapperToBand = new Map<HTMLElement, FixedBand>()

  papers.forEach((paper) => {
    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper]'),
    ) as HTMLElement[]
    wrappers.sort(compareByOriginalTop)

    let currentBand: FixedBand | null = null

    wrappers.forEach((wrapper) => {
      if (wrapper.hasAttribute('data-flow-id')) return
      if (wrapper.getAttribute('data-repeat-per-page') === 'true') return
      // 浮动叠层不并入 band
      if (wrapper.getAttribute('data-page-overlay') === '1') return

      const origTop = getOriginalTop(wrapper)
      const origH = getOriginalHeight(wrapper)
      const origBottom = origTop + origH

      const isHeader = headerHeight > 0 && origTop < headerHeight + marginTop
      const isFooter = footerHeight > 0 && origTop >= pageHeight - footerHeight - marginBottom
      if (isHeader || isFooter) return

      if (!currentBand || origTop > currentBand.originalBottom + 0.5) {
        currentBand = {
          originalTop: origTop,
          originalBottom: origBottom,
          height: Math.max(0, origH),
        }
      } else if (origBottom > currentBand.originalBottom) {
        currentBand.originalBottom = origBottom
        currentBand.height = Math.max(0, currentBand.originalBottom - currentBand.originalTop)
      }

      wrapperToBand.set(wrapper, currentBand)
    })
  })

  return wrapperToBand
}

function syncElementsBelowTables(
  container: HTMLElement,
  pageHeight: number,
  papers: HTMLElement[],
  headerHeight: number,
  footerHeight: number,
  flowOnly: boolean,
  freezeFlow: boolean,
  flowWrapperHeightCache: Map<HTMLElement, number> | null,
): HTMLElement[] {
  const marginTop = 0
  const marginBottom = 0
  const effectiveHeaderHeight = headerHeight
  const effectiveFooterHeight = footerHeight

  // 构建流式元素锚点映射
  const anchorsByOrigin = new Map<number, Array<{ originalBottom: number; finalGlobalBottom: number }>>()

  papers.forEach((paper, pageIdx) => {
    const paperRect = paper.getBoundingClientRect()
    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper][data-flow-id]'),
    ) as HTMLElement[]

    wrappers.forEach((wrapper) => {
      if (!wrapper.hasAttribute('data-flow-paginated')) return

      const flowKind = getFlowKind(wrapper)
      const table = wrapper.querySelector('table')
      const autoHeightEl = resolveTextContentEl(wrapper)

      if (flowKind === 'table') {
        if (!table) return
        if (table.getAttribute('data-auto-paginate') !== 'true') return
      } else if (flowKind === 'auto-height') {
        if (!autoHeightEl) return
      } else {
        if (!table && !autoHeightEl) return
        if (table && table.getAttribute('data-auto-paginate') !== 'true') return
      }

      const originPage = getOriginPage(wrapper)
      const origTop = getOriginalTop(wrapper)
      const origH = getOriginalHeight(wrapper)
      const origBottom = origTop + origH

      const contentRect = (table || autoHeightEl)!.getBoundingClientRect()
      // 有最低高度时以 wrapper 底边为准，否则下方元素仍按设计高度留白、内容却只占一行
      const boxBottom = Math.max(contentRect.bottom, wrapper.getBoundingClientRect().bottom)
      const finalBottomInPage = viewportYToPageY(paperRect, boxBottom, pageHeight)
      const finalGlobalBottom = pageIdx * pageHeight + finalBottomInPage

      const list = anchorsByOrigin.get(originPage) || []
      const existing = list.find((item) => Math.abs(item.originalBottom - origBottom) < 0.5)
      if (!existing) {
        list.push({ originalBottom: origBottom, finalGlobalBottom })
      } else if (finalGlobalBottom > existing.finalGlobalBottom) {
        existing.finalGlobalBottom = finalGlobalBottom
      }
      anchorsByOrigin.set(originPage, list)
    })
  })

  anchorsByOrigin.forEach((list) => list.sort((a, b) => a.originalBottom - b.originalBottom))

  // 按原始页面分组 wrapper
  const wrappersByOrigin = new Map<number, HTMLElement[]>()
  papers.forEach((paper, pageIdx) => {
    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper]'),
    ) as HTMLElement[]
    wrappers.forEach((wrapper) => {
      const originPage = getOriginPage(wrapper)
      const list = wrappersByOrigin.get(originPage) || []
      list.push(wrapper)
      wrappersByOrigin.set(originPage, list)
    })
  })

  wrappersByOrigin.forEach((list) => list.sort(compareByOriginalTop))

  let pageIndexMap = new Map<HTMLElement, number>(
    papers.map((p, i) => [p, i] as [HTMLElement, number]),
  )

  const fixedBandByWrapper = buildFixedBands(
    papers, headerHeight, footerHeight, pageHeight, marginTop, marginBottom,
  )

  type BandPlacement = { pageIndex: number; top: number }
  const bandPlacementCache = new Map<FixedBand, BandPlacement>()

  wrappersByOrigin.forEach((wrappers, originPage) => {
    let previousOriginalBottom: number | null = null
    let previousFinalGlobalBottom: number | null = null

    wrappers.forEach((wrapper) => {
      if (
        wrapper.hasAttribute('data-flow-id') &&
        (wrapper.hasAttribute('data-is-split-chunk') ||
          wrapper.hasAttribute('data-flow-forced-page-break'))
      ) {
        return
      }
      if (wrapper.getAttribute('data-repeat-per-page') === 'true') return

      if (flowOnly && !wrapper.hasAttribute('data-flow-id')) return
      if (freezeFlow && wrapper.hasAttribute('data-flow-id')) return
      if (wrapper.getAttribute('data-page-overlay') === '1') return

      const anchors = anchorsByOrigin.get(originPage)
      const origTop = getOriginalTop(wrapper)
      const storedH = parseAttr(wrapper, 'data-original-height', -1)
      const origH = storedH >= 0 ? storedH : elHeight(wrapper)
      const origBottom = origTop + origH

      const isHeader = headerHeight > 0 && origTop < headerHeight + marginTop
      const isFooter = footerHeight > 0 && origTop >= pageHeight - footerHeight - marginBottom
      if (isHeader || isFooter) return

      const curTop = parseFloat(wrapper.style.top || '') || 0
      const curPaper = resolvePaper(wrapper)
      let curPageIdx = curPaper
        ? (pageIndexMap.get(curPaper) ?? papers.indexOf(curPaper))
        : originPage
      if (curPageIdx < 0) curPageIdx = originPage

      let targetGlobalTop = curPageIdx * pageHeight + curTop

      // 锚定到上方已分页流式元素
      if (anchors && anchors.length > 0) {
        let selected: { originalBottom: number; finalGlobalBottom: number } | null = null
        for (const a of anchors) {
          if (a.originalBottom <= origTop + 0.01) {
            selected = a
          } else {
            break
          }
        }
        if (selected) {
          const gap = origTop - selected.originalBottom
          targetGlobalTop = selected.finalGlobalBottom + gap
        }
      }

      // 串行顺序保护
      if (previousOriginalBottom !== null && previousFinalGlobalBottom !== null) {
        const serialGap = origTop - previousOriginalBottom
        if (serialGap >= -0.01) {
          const serialGlobalTop = previousFinalGlobalBottom + serialGap
          if (serialGlobalTop > targetGlobalTop) {
            targetGlobalTop = serialGlobalTop
          }
        }
      }

      let targetPageIdx = Math.floor(targetGlobalTop / pageHeight)
      if (targetPageIdx < 0) targetPageIdx = 0

      let targetTop = targetGlobalTop - targetPageIdx * pageHeight
      const minContentTop = marginTop + effectiveHeaderHeight
      const maxContentBottom = pageHeight - effectiveFooterHeight - marginBottom
      const availableContentHeight = maxContentBottom - minContentTop

      const isFlow = wrapper.hasAttribute('data-flow-id')
      const wrapperH = isFlow
        ? (flowWrapperHeightCache?.get(wrapper) ?? elHeight(wrapper))
        : storedH >= 0 ? storedH : elHeight(wrapper)

      const band = !isFlow ? fixedBandByWrapper.get(wrapper) || null : null
      const bandOffsetTop = band ? origTop - band.originalTop : 0
      const bandHeight = band ? band.height : wrapperH

      if (wrapperH > 0 || bandHeight > 0) {
        if (isFlow) {
          if (targetTop < minContentTop) targetTop = minContentTop

          if (targetTop >= maxContentBottom - 0.5) {
            let overflow = targetTop - maxContentBottom
            targetPageIdx += 1
            targetTop = minContentTop + Math.max(overflow, 0)

            while (targetTop >= maxContentBottom - 0.5) {
              overflow = targetTop - maxContentBottom
              targetPageIdx += 1
              targetTop = minContentTop + Math.max(overflow, 0)
            }
          }
        } else if (band) {
          const cached = bandPlacementCache.get(band)
          if (cached) {
            targetPageIdx = cached.pageIndex
            targetTop = cached.top + bandOffsetTop
          } else {
            const bandGlobalTop = targetGlobalTop - bandOffsetTop
            let bpIdx = Math.floor(bandGlobalTop / pageHeight)
            if (bpIdx < 0) bpIdx = 0
            let bTop = bandGlobalTop - bpIdx * pageHeight

            if (bTop < minContentTop) bTop = minContentTop

            if (bandHeight <= availableContentHeight && bTop + bandHeight > maxContentBottom) {
              let overflow = Math.max(0, bTop - maxContentBottom)
              bpIdx += 1
              bTop = minContentTop + Math.max(overflow, 0)

              while (bTop + bandHeight > maxContentBottom + 0.5) {
                overflow = Math.max(0, bTop - maxContentBottom)
                bpIdx += 1
                bTop = minContentTop + Math.max(overflow, 0)
              }
            } else if (bandHeight > availableContentHeight) {
              bTop = minContentTop
            }

            bandPlacementCache.set(band, { pageIndex: bpIdx, top: bTop })
            targetPageIdx = bpIdx
            targetTop = bTop + bandOffsetTop
          }
        } else if (wrapperH <= availableContentHeight && targetTop + wrapperH > maxContentBottom) {
          if (targetTop < minContentTop) targetTop = minContentTop

          let overflow = targetTop + wrapperH - maxContentBottom
          targetPageIdx += 1
          targetTop = minContentTop + Math.max(overflow, 0)

          while (targetTop + wrapperH > maxContentBottom + 0.5) {
            overflow = targetTop + wrapperH - maxContentBottom
            targetPageIdx += 1
            targetTop = minContentTop + Math.max(overflow, 0)
          }
        } else if (wrapperH > availableContentHeight) {
          if (targetTop < minContentTop) targetTop = minContentTop
          targetTop = minContentTop
        } else if (targetTop < minContentTop) {
          targetTop = minContentTop
        }
      }

      // 确保目标页存在
      let allPapers = getPapers(container)
      while (targetPageIdx >= allPapers.length) {
        createOverflowPage(container, allPapers, allPapers.length - 1)
        allPapers = getPapers(container)

        pageIndexMap = new Map<HTMLElement, number>(
          allPapers.map((p, i) => [p, i] as [HTMLElement, number]),
        )
      }

      const targetPaper = allPapers[targetPageIdx]
      const prevTop = parseFloat(wrapper.style.top || '') || 0
      const didMovePage = resolvePaper(wrapper) !== targetPaper
      const didMoveTop = Math.abs(prevTop - targetTop) > 0.1

      if (resolvePaper(wrapper) !== targetPaper) {
        getPaperAppendTarget(targetPaper).appendChild(wrapper)
      }
      wrapper.style.removeProperty('top')
      wrapper.style.setProperty('top', `${targetTop}px`, 'important')

      if (
        wrapper.hasAttribute('data-flow-id') &&
        wrapper.hasAttribute('data-flow-paginated') &&
        (didMovePage || didMoveTop)
      ) {
        wrapper.removeAttribute('data-flow-paginated')
      }

      // 更新串行参考
      const finalGlobalTop = targetPageIdx * pageHeight + targetTop
      const isFlowWrapper = wrapper.hasAttribute('data-flow-id')
      const flowEntry = isFlowWrapper
        ? anchors?.find((item) => Math.abs(item.originalBottom - origBottom) < 0.5)
        : null
      const hasReliableSerialBottom = !isFlowWrapper || !!flowEntry
      if (hasReliableSerialBottom) {
        const bandPlacement = band ? bandPlacementCache.get(band) : null
        const finalGlobalBottom = flowEntry
          ? flowEntry.finalGlobalBottom
          : band && bandPlacement
            ? bandPlacement.pageIndex * pageHeight + bandPlacement.top + bandHeight
            : finalGlobalTop + wrapperH
        previousOriginalBottom = band ? band.originalBottom : origBottom
        previousFinalGlobalBottom = finalGlobalBottom
      }
    })
  })

  return getPapers(container)
}

/* ── 状态检查（参考 print2 的 checkFlowWrapperStatus） ── */

function checkFlowWrapperStatus(
  container: HTMLElement,
  pageHeight: number,
  headerHeight: number,
  footerHeight: number,
): { repairedCount: number; pendingCount: number } {
  let repairedCount = 0
  let pendingCount = 0

  const papers = getPapers(container)
  const marginBottom = 0
  const effectiveFooterHeight = footerHeight

  papers.forEach((paper) => {
    const paperRect = paper.getBoundingClientRect()
    const limitBottom = pageYToViewportY(
      paperRect,
      pageHeight - effectiveFooterHeight - marginBottom,
      pageHeight,
    )

    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper][data-flow-id]'),
    ) as HTMLElement[]

    wrappers.forEach((wrapper) => {
      if (wrapper.getAttribute('data-repeat-per-page') === 'true') return

      const flowKind = getFlowKind(wrapper)
      const table = wrapper.querySelector('table') as HTMLElement | null
      const autoHeightEl = resolveTextContentEl(wrapper)
      const isAutoHeight = flowKind === 'auto-height' || (!table && !!autoHeightEl)

      if (!table && !autoHeightEl) return
      if (table && !isAutoHeight) {
        if (table.getAttribute('data-auto-paginate') !== 'true') return
      }

      if (wrapper.hasAttribute('data-flow-paginated')) {
        const contentRect = (table || autoHeightEl)!.getBoundingClientRect()
        if (contentRect.bottom > limitBottom + 1) {
          wrapper.removeAttribute('data-flow-paginated')
          repairedCount += 1
        }
      } else {
        if (!isAxisAlignedWrapper(wrapper)) return
        pendingCount += 1
      }
    })
  })

  return { repairedCount, pendingCount }
}

/* ── 溢出文本提升（参考 print2 的 promoteFooterOverflowTextWrappers） ── */

function promoteFooterOverflowTextWrappers(
  container: HTMLElement,
  pageHeight: number,
  headerHeight: number,
  footerHeight: number,
): number {
  let promoted = 0
  const papers = getPapers(container)
  const marginTop = 0
  const marginBottom = 0
  const effectiveFooterHeight = footerHeight

  papers.forEach((paper, pageIdx) => {
    const paperRect = paper.getBoundingClientRect()
    const limitBottom = pageYToViewportY(
      paperRect,
      pageHeight - effectiveFooterHeight - marginBottom,
      pageHeight,
    )

    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper]:not([data-flow-id])'),
    ) as HTMLElement[]

    wrappers.forEach((wrapper) => {
      if (wrapper.getAttribute('data-repeat-per-page') === 'true') return
      if (wrapper.querySelector('table')) return
      if (!isAxisAlignedWrapper(wrapper)) return

      const textEl = resolveTextContentEl(wrapper)
      if (!textEl) return

      const origTop = getOriginalTop(wrapper)
      const isHeader = headerHeight > 0 && origTop < headerHeight + marginTop
      const isFooter = footerHeight > 0 && origTop >= pageHeight - footerHeight - marginBottom
      if (isHeader || isFooter) return

      const textRect = textEl.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()
      const renderedBottom = Math.max(textRect.bottom, wrapperRect.bottom)
      if (renderedBottom <= limitBottom + 1) return

      const flowId = wrapper.getAttribute('data-wrapper-seq') || `${pageIdx}-promoted-${promoted}`
      wrapper.setAttribute('data-flow-id', flowId)
      wrapper.setAttribute('data-flow-kind', 'auto-height')
      wrapper.removeAttribute('data-flow-paginated')
      promoted += 1
    })
  })

  return promoted
}

/* ── 流式元素分页（一次遍历，参考 print2 的 runFlowPaginationPass） ── */

function runFlowPaginationPass(
  container: HTMLElement,
  pageHeight: number,
  headerHeight: number,
  footerHeight: number,
): void {
  const papers = getPapers(container)
  const marginBottom = 0
  const effectiveHeaderHeight = headerHeight
  const effectiveFooterHeight = footerHeight
  // 流式续页起排：页眉高度 + 上偏移（px）
  const hinnn = (window as any).hinnn
  const resolveFlowMinTop = (paper: HTMLElement) => {
    const topOffPt = Number(paper.getAttribute('data-top-offset-pt') || '')
    const topOffPx =
      Number.isFinite(topOffPt) && topOffPt > 0
        ? hinnn?.pt?.toPx?.(topOffPt) ?? topOffPt * (96 / 72)
        : 0
    return effectiveHeaderHeight + topOffPx
  }

  // 预计算全量 flow wrappers（参考 print2 的 hasUnresolvedEarlierFlow 优化）
  const allFlowWrappers = Array.from(
    container.querySelectorAll('[data-print-wrapper][data-flow-id]'),
  ) as HTMLElement[]

  const unresolvedMap = new Map<number, HTMLElement[]>()
  allFlowWrappers.forEach((w) => {
    if (!w.hasAttribute('data-flow-paginated') && isProcessableFlowWrapper(w)) {
      const originIdx = getOriginPage(w)
      if (!unresolvedMap.has(originIdx)) unresolvedMap.set(originIdx, [])
      unresolvedMap.get(originIdx)!.push(w)
    }
  })

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i]
    const minTop = resolveFlowMinTop(paper)
    const paperRect = paper.getBoundingClientRect()
    const limitBottom = pageYToViewportY(
      paperRect,
      pageHeight - effectiveFooterHeight - marginBottom,
      pageHeight,
    )

    const flowWrappers = (Array.from(
      paper.querySelectorAll('[data-print-wrapper][data-flow-id]'),
    ) as HTMLElement[]).sort(compareByOriginalTop)

    for (const wrapper of flowWrappers) {
      // hiprint DOM: wrapper 挂在 .hiprint-printPaper-content 下，不能用 parentElement === paper
      if (resolvePaper(wrapper) !== paper) continue
      if (wrapper.hasAttribute('data-flow-paginated')) continue

      const flowKind = getFlowKind(wrapper)
      const table = wrapper.querySelector('table') as HTMLElement | null
      const autoHeightEl = resolveTextContentEl(wrapper)
      const isAutoHeight = flowKind === 'auto-height' || (!table && !!autoHeightEl)

      if (!table && !autoHeightEl) continue

      if (table && flowKind !== 'auto-height') {
        if (table.getAttribute('data-auto-paginate') !== 'true') continue
      }

      if (!isAxisAlignedWrapper(wrapper)) continue

      // 检查前序流式元素是否已完成分页
      const currentOrigin = getOriginPage(wrapper)
      const unresolvedCandidates = unresolvedMap.get(currentOrigin)
      if (unresolvedCandidates && unresolvedCandidates.some((candidate) => {
        if (candidate === wrapper) return false
        if (candidate.getAttribute('data-flow-id') === wrapper.getAttribute('data-flow-id')) return false
        if (compareByOriginalTop(candidate, wrapper) >= 0) return false
        return true
      })) {
        continue
      }

      // 解除高度限制
      wrapper.style.height = 'auto'
      if (table) {
        table.style.height = 'auto'
        table.style.maxHeight = 'none'
        table.style.minHeight = '0'
        const tbodyEl = table.querySelector('tbody')
        if (tbodyEl) {
          (tbodyEl as HTMLElement).style.height = 'auto'
          ;(tbodyEl as HTMLElement).style.maxHeight = 'none'
          ;(tbodyEl as HTMLElement).style.minHeight = '0'
        }

        const tableRoot = table.parentElement as HTMLElement | null
        if (tableRoot) {
          tableRoot.classList.remove('h-full', 'overflow-hidden')
          tableRoot.style.height = 'auto'
          tableRoot.style.maxHeight = 'none'
          tableRoot.style.overflow = 'visible'
        }

        let tableAncestor = table.parentElement as HTMLElement | null
        while (tableAncestor && tableAncestor !== wrapper) {
          tableAncestor.classList.remove('h-full', 'overflow-hidden')
          tableAncestor.style.height = 'auto'
          tableAncestor.style.maxHeight = 'none'
          tableAncestor.style.overflow = 'visible'
          tableAncestor = tableAncestor.parentElement as HTMLElement | null
        }
      } else if (isAutoHeight && autoHeightEl) {
        const htmlEl = autoHeightEl
        const originalContentHeight = htmlEl.getBoundingClientRect().height
        htmlEl.classList.remove('h-full', 'overflow-hidden')
        htmlEl.style.height = 'auto'
        htmlEl.style.overflow = 'visible'

        const textRoot = htmlEl.parentElement as HTMLElement | null
        if (textRoot) {
          textRoot.style.height = 'auto'
          textRoot.style.overflow = 'visible'
        }

        // 保留最低高度，避免 auto 后盒子塌成内容高、下方仍按设计 40pt 留白
        const lHeightPt = parseFloat(wrapper.getAttribute('data-l-height') || '')
        if (Number.isFinite(lHeightPt) && lHeightPt > 0) {
          wrapper.style.minHeight = `${lHeightPt}pt`
          if (textRoot) textRoot.style.minHeight = `${lHeightPt}pt`
        }

        applyFirstLineAlignment(wrapper, htmlEl, originalContentHeight)
      }

      // 获取 wrapper 在当前页中的位置
      const wrapperRect = wrapper.getBoundingClientRect()
      const wrapperTopInPage = viewportYToPageY(paperRect, wrapperRect.top, pageHeight)

      if (isAutoHeight) {
        if (!autoHeightEl) continue

        const contentRect = autoHeightEl.getBoundingClientRect()
        if (contentRect.bottom <= limitBottom + 1) {
          wrapper.setAttribute('data-flow-paginated', 'true')
          syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, false, null)
          continue
        }

        const textEl = autoHeightEl
        const fullText = textEl.textContent || ''

        if (!fullText) {
          wrapper.setAttribute('data-flow-paginated', 'true')
          syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, false, null)
          continue
        }

        let splitIndex = findAutoHeightSplitIndex(textEl, fullText, limitBottom)

        if (splitIndex <= 0) {
          // 连 1 个字符都放不下
          if (wrapperTopInPage <= minTop + 5) {
            splitIndex = 1 // 强制保留至少 1 字符防死循环
          } else {
            // 整体移到下一页
            const allPapers = getPapers(container)
            const newPage = createOverflowPage(container, allPapers, i)
            wrapper.style.removeProperty('top')
            wrapper.style.setProperty('top', `${minTop}px`, 'important')
            wrapper.setAttribute('data-flow-forced-page-break', 'true')
            wrapper.removeAttribute('data-is-split-chunk')
            wrapper.removeAttribute('data-flow-paginated')
            getPaperAppendTarget(newPage).appendChild(wrapper)
            syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, true, false, null)
            return
          }
        }

        if (splitIndex >= fullText.length) {
          wrapper.setAttribute('data-flow-paginated', 'true')
          syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, false, null)
          continue
        }

        // 正常拆分
        const currentText = fullText.slice(0, splitIndex)
        const overflowText = fullText.slice(splitIndex)
        textEl.textContent = currentText

        const allPapers = getPapers(container)
        const newPage = createOverflowPage(container, allPapers, i)
        const newWrapper = wrapper.cloneNode(true) as HTMLElement
        const newTextEl = resolveTextContentEl(newWrapper)
        if (newTextEl) {
          newTextEl.classList.remove('h-full', 'overflow-hidden')
          newTextEl.style.height = 'auto'
          newTextEl.style.overflow = 'visible'
          clearFirstLineAlignment(newTextEl)
          newTextEl.textContent = overflowText

          const newTextRoot = newTextEl.parentElement as HTMLElement | null
          if (newTextRoot) {
            newTextRoot.style.height = 'auto'
            newTextRoot.style.overflow = 'visible'
          }
        }

        newWrapper.style.removeProperty('top')
        newWrapper.style.setProperty('top', `${minTop}px`, 'important')
        getPaperAppendTarget(newPage).appendChild(newWrapper)

        wrapper.setAttribute('data-flow-paginated', 'true')
        wrapper.removeAttribute('data-flow-forced-page-break')
        newWrapper.setAttribute('data-is-split-chunk', 'true')
        newWrapper.removeAttribute('data-flow-forced-page-break')

        syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, true, false, null)
        return
      }

      // 表格分页（保留完整表格处理，参考 print2）
      if (!table) {
        wrapper.setAttribute('data-flow-paginated', 'true')
        syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, false, null)
        continue
      }

      // 表格拆分（与 print2 完全一致）
      let splitIndex = -1
      const tbody = table.querySelector('tbody')
      if (!tbody) continue
      const rows = Array.from(tbody.querySelectorAll('tr'))

      const tfoot = table.querySelector('tfoot')
      const isFooterRepeated = table.getAttribute('data-tfoot-repeat') === 'true'
      let repeatedFooterHeight = 0
      if (tfoot && isFooterRepeated) {
        repeatedFooterHeight = tfoot.getBoundingClientRect().height
      }

      const tableRect = table.getBoundingClientRect()
      const availableContentHeight = pageHeight - minTop - effectiveFooterHeight - marginBottom
      const tableFitsFreshPage = tableRect.height <= availableContentHeight * getPageScaleY(paperRect, pageHeight) + 1
      const firstRowBottomWithFooter = rows[0]
        ? rows[0].getBoundingClientRect().bottom + repeatedFooterHeight
        : Number.POSITIVE_INFINITY
      const firstRowFitsCurrentPage = rows.length > 0 && firstRowBottomWithFooter <= limitBottom + 1

      if (
        rows.length > 0 &&
        tableRect.bottom > limitBottom + 1 &&
        wrapperTopInPage > minTop + 5 &&
        tableFitsFreshPage &&
        !firstRowFitsCurrentPage
      ) {
        const allPapers2 = getPapers(container)
        const newPage = createOverflowPage(container, allPapers2, i)
        wrapper.style.removeProperty('top')
        wrapper.style.setProperty('top', `${minTop}px`, 'important')
        wrapper.setAttribute('data-flow-forced-page-break', 'true')
        wrapper.removeAttribute('data-is-split-chunk')
        wrapper.removeAttribute('data-flow-paginated')
        getPaperAppendTarget(newPage).appendChild(wrapper)
        syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, true, false, null)
        return
      }

      // 二分查找第一个溢出行
      const rowCount = rows.length
      if (rowCount > 0) {
        const lastOverflows = !isFooterRepeated
          ? tableRect.bottom > limitBottom + 1
          : rows[rowCount - 1].getBoundingClientRect().bottom + repeatedFooterHeight > limitBottom + 1

        if (lastOverflows) {
          let lo = 0
          let hi = rowCount - 2
          splitIndex = rowCount - 1

          while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (rows[mid].getBoundingClientRect().bottom + repeatedFooterHeight > limitBottom + 1) {
              splitIndex = mid
              hi = mid - 1
            } else {
              lo = mid + 1
            }
          }
        }
      }

      if (splitIndex === 0) {
        if (wrapperTopInPage <= minTop + 5) {
          splitIndex = 1 // 强制保留一行防死循环
        }
      }

      if (splitIndex === -1 && rows.length > 0) {
        if (tableRect.bottom > limitBottom + 2) {
          if (wrapperTopInPage > minTop + 5) {
            splitIndex = firstRowFitsCurrentPage && rows.length > 1 ? rows.length - 1 : 0
          } else if (rows.length > 1) {
            splitIndex = rows.length - 1
          } else {
            splitIndex = 1
          }
        }
      }

      if (splitIndex !== -1) {
        const allPapers3 = getPapers(container)
        const newPage = createOverflowPage(container, allPapers3, i)
        const newWrapper = wrapper.cloneNode(true) as HTMLElement

        newWrapper.style.removeProperty('top')
        newWrapper.style.setProperty('top', `${minTop}px`, 'important')

        // 清理旧表格
        const oldRows = rows
        for (let k = splitIndex; k < oldRows.length; k++) {
          oldRows[k].remove()
        }

        if (splitIndex === 0) {
          wrapper.remove()
        }

        const oldTfoot = table.querySelector('tfoot')
        if (oldTfoot) {
          if (!isFooterRepeated) {
            oldTfoot.remove()
          }
        }

        // 清理新表格
        const newTable = newWrapper.querySelector('table') as HTMLElement
        newTable.style.height = 'auto'
        const newTbody = newTable.querySelector('tbody') as HTMLElement
        if (newTbody) {
          newTbody.style.height = 'auto'
          const newRowsList = Array.from(newTbody.querySelectorAll('tr'))
          for (let k = 0; k < splitIndex; k++) {
            newRowsList[k]?.remove()
          }
        }

        getPaperAppendTarget(newPage).appendChild(newWrapper)
        wrapper.setAttribute('data-flow-paginated', 'true')

        if (splitIndex === 0) {
          newWrapper.removeAttribute('data-is-split-chunk')
          newWrapper.setAttribute('data-flow-forced-page-break', 'true')
        } else {
          newWrapper.setAttribute('data-is-split-chunk', 'true')
          newWrapper.removeAttribute('data-flow-forced-page-break')
        }

        syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, true, false, null)
      } else {
        wrapper.setAttribute('data-flow-paginated', 'true')
        syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, false, null)
      }
    }
  }
}

/* ── 分页主循环（参考 print2 的 runFlowPaginationLoop） ── */

function runFlowPaginationLoop(
  container: HTMLElement,
  pageHeight: number,
  headerHeight: number,
  footerHeight: number,
): void {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    runFlowPaginationPass(container, pageHeight, headerHeight, footerHeight)
    const { repairedCount, pendingCount } = checkFlowWrapperStatus(
      container, pageHeight, headerHeight, footerHeight,
    )
    if (repairedCount === 0 && pendingCount === 0) break
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* 阶段 3：清理                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

function removeEmptyPages(container: HTMLElement, headerHeight: number, footerHeight: number, pageHeight: number): void {
  const papers = getPapers(container)
  const marginTop = 0
  const marginBottom = 0

  for (let i = papers.length - 1; i > 0; i--) {
    const paper = papers[i]
    const wrappers = Array.from(
      paper.querySelectorAll('[data-print-wrapper]'),
    ) as HTMLElement[]

    const hasContent = wrappers.some((w) => {
      if (w.hasAttribute('data-flow-id')) return true

      const isRepeat = w.getAttribute('data-repeat-per-page') === 'true'
      if (isRepeat) return false

      const top = parseFloat(w.style.top || '0') || 0
      const isHeader = headerHeight > 0 && top < headerHeight + marginTop
      const isFooter = footerHeight > 0 && top >= pageHeight - footerHeight - marginBottom
      if (isHeader || isFooter) return false

      return true
    })

    if (!hasContent) {
      const panel = paper.parentElement
      paper.remove()
      // 仅清理空的 hiprint-printPanel；拉平后父级可能是 printTemplate，不能误删
      if (
        panel &&
        panel.classList.contains('hiprint-printPanel') &&
        panel.querySelectorAll('.hiprint-printPaper').length === 0
      ) {
        panel.remove()
      }
    }
  }
}

function fixPageTops(container: HTMLElement, pageHeight: number): void {
  const papers = getPapers(container)
  papers.forEach((p, idx) => {
    p.style.top = `${idx * pageHeight}px`
  })
}

/**
 * 表格撑高后若压住下方内容，按下推使间距恢复为设计间距（data-design-gap-px）。
 */
function pushElementsBelowGrownTables(container: HTMLElement): void {
  const hinnn = (window as any).hinnn
  for (const paper of getPapers(container)) {
    const host = getElementContainer(paper)
    const paperTop = paper.getBoundingClientRect().top
    const tables = Array.from(
      host.querySelectorAll('.hiprint-printElement-table'),
    ) as HTMLElement[]

    for (const table of tables) {
      const designGapPx = parseFloat(table.getAttribute('data-design-gap-px') || '')
      if (!(designGapPx >= 0)) continue

      const tableTop = table.getBoundingClientRect().top - paperTop
      const actualBottom = table.getBoundingClientRect().bottom - paperTop
      const siblings = Array.from(host.children) as HTMLElement[]

      // 被表身盖住的「表后」起点
      let bandMin = Infinity
      for (const el of siblings) {
        if (el === table || table.contains(el)) continue
        if (el.classList.contains('hiprint-paperNumber')) continue
        if (el.getAttribute('data-page-footer') === '1') continue
        if (el.getAttribute('data-page-header') === '1') continue
        if (el.getAttribute('data-page-overlay') === '1') continue
        const cs = window.getComputedStyle(el)
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue
        const top =
          cssLengthToPx(el.style.top) ||
          el.getBoundingClientRect().top - paperTop
        const bottom = el.getBoundingClientRect().bottom - paperTop
        if (top < actualBottom - 1 && bottom > tableTop + 1 && top > tableTop + 24) {
          if (top < bandMin) bandMin = top
        }
      }
      if (!(bandMin < Infinity)) continue

      const currentGap = bandMin - actualBottom
      const shift = designGapPx - currentGap
      if (shift <= 1) continue

      for (const el of siblings) {
        if (el === table || table.contains(el)) continue
        if (el.classList.contains('hiprint-paperNumber')) continue
        if (el.getAttribute('data-page-footer') === '1') continue
        if (el.getAttribute('data-page-header') === '1') continue
        if (el.getAttribute('data-page-overlay') === '1') continue
        const cs = window.getComputedStyle(el)
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue
        const top =
          cssLengthToPx(el.style.top) ||
          el.getBoundingClientRect().top - paperTop
        if (top + 0.5 < bandMin) continue
        const next = top + shift
        if ((el.style.top || '').includes('pt') && hinnn?.px?.toPt) {
          el.style.top = `${hinnn.px.toPt(next)}pt`
        } else {
          el.style.top = `${next}px`
        }
      }
    }
  }
}

function cleanupDataAttributes(container: HTMLElement): void {
  const wrappers = Array.from(
    container.querySelectorAll('[data-print-wrapper]'),
  ) as HTMLElement[]

  // 第一遍：收集所有 wrapper → paper 映射，同时处理已连接到 DOM 的 wrapper
  const orphanWrappers: HTMLElement[] = []

  for (const wrapper of wrappers) {
    // 父级通常是 hiprint-printPaper-content，保持原挂载点即可
    const host = wrapper.parentElement
    if (!host) {
      orphanWrappers.push(wrapper)
      continue
    }

    const children = Array.from(wrapper.children) as HTMLElement[]
    for (const child of children) {
      child.style.position = wrapper.style.position || 'absolute'
      // 横向位置/宽度恢复 hiprint 原始 pt，避免弹窗动画污染后的 px
      const origLeft = wrapper.getAttribute('data-orig-left')
      const origWidth = wrapper.getAttribute('data-orig-width')
      const origHeight = wrapper.getAttribute('data-orig-height')
      child.style.left = origLeft || wrapper.style.left || ''
      child.style.width = origWidth || wrapper.style.width || ''
      // top/height 可能被流式分页改写，优先用 wrapper 当前值
      child.style.top = wrapper.style.top || ''
      child.style.height = wrapper.style.height || origHeight || ''

      host.insertBefore(child, wrapper)
    }

    wrapper.remove()
  }

  // 第二遍：处理孤立 wrapper（父级已被移除），恢复到第一个可用 paper
  if (orphanWrappers.length > 0) {
    const papers = getPapers(container)
    const fallbackPaper = papers[0]
    if (fallbackPaper) {
      for (const wrapper of orphanWrappers) {
        const children = Array.from(wrapper.children) as HTMLElement[]
        for (const child of children) {
          child.style.position = wrapper.style.position || 'absolute'
          const origLeft = wrapper.getAttribute('data-orig-left')
          const origWidth = wrapper.getAttribute('data-orig-width')
          const origHeight = wrapper.getAttribute('data-orig-height')
          child.style.left = origLeft || wrapper.style.left || ''
          child.style.width = origWidth || wrapper.style.width || ''
          child.style.top = wrapper.style.top || ''
          child.style.height = wrapper.style.height || origHeight || ''

          fallbackPaper.appendChild(child)
        }
        // wrapper 已脱离 DOM，无需 remove
      }
    }
  }

  const textContentEls = container.querySelectorAll('[data-text-content="true"]')
  textContentEls.forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = '100%'
    htmlEl.style.overflow = ''
    // 只撤销首行对齐临时加的偏移，保留 hiprint 的 contentPaddingTop
    clearFirstLineAlignment(htmlEl)
    htmlEl.removeAttribute('data-text-content')
  })
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* 主入口                                                                */
/* ═══════════════════════════════════════════════════════════════════════ */

export interface TextPaginationOptions {
  /** 跳过 fixPageTops（预览模式下 papers 由 flex 排布，不应强制设置绝对 top） */
  skipFixTops?: boolean
  /** 跳过 removeEmptyPages */
  skipRemoveEmpty?: boolean
}

export function handleTextPagination(
  container: HTMLElement,
  options: TextPaginationOptions = {},
): void {
  const {
    skipFixTops = false,
    skipRemoveEmpty = false,
  } = options

  // 先拉平 papers，消除 panel 嵌套导致的溢出页错位
  flattenPrintPapers(container)

  const papers = getPapers(container)
  if (papers.length === 0) return

  const pageHeight =
    cssLengthToPx(papers[0].style.height) ||
    papers[0].getBoundingClientRect().height
  if (pageHeight <= 0) return

  // hiprint 没有页眉/页脚概念
  const headerHeight = 0
  const footerHeight = 0

  // 记录原始页数，判断本算法是否新建了溢出页
  const originalPaperCount = papers.length

  // 多页：只压缩「溢出页」底部空白（把后续 panel 内容上移填入），
  // 不碰每个 source-panel 的设计首页，避免把多面板揉乱。
  if (originalPaperCount > 1) {
    compactOverflowPageBlanks(container, pageHeight)
    if (!skipRemoveEmpty) {
      removeEmptyPages(container, headerHeight, footerHeight, pageHeight)
    }
    // compactOverflowPageBlanks 内会 preprocess 包裹元素；多页早退也必须拆掉 wrapper，
    // 否则子元素 left 被清空、定位留在 wrapper 上，后续 normalize/钉页尾会错位重叠。
    cleanupDataAttributes(container)
    pushElementsBelowGrownTables(container)
    container.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())
    return
  }

  // 阶段 0：预处理 —— 包裹 hiprint 元素
  preprocessHiprintDOM(container)

  // 检查是否存在可拆分的流式元素
  const hasFlowElements = container.querySelector('[data-flow-id]') !== null

  if (!hasFlowElements) {
    // 没有流式元素 → 直接清理恢复，不做任何重排
    cleanupDataAttributes(container)
    container.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())
    return
  }

  // 阶段 1：流式元素分页循环
  runFlowPaginationLoop(container, pageHeight, headerHeight, footerHeight)

  const papersAfterFlow = getPapers(container)
  const flowCreatedPages = papersAfterFlow.length > originalPaperCount

  // 阶段 2：仅当本算法新建了溢出页时再做最终收敛
  if (flowCreatedPages) {
    for (let settle = 0; settle < 3; settle++) {
      syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, true, null)
      const promotedCount = promoteFooterOverflowTextWrappers(container, pageHeight, headerHeight, footerHeight)
      if (promotedCount === 0) break
      runFlowPaginationLoop(container, pageHeight, headerHeight, footerHeight)
    }

    syncElementsBelowTables(container, pageHeight, getPapers(container), headerHeight, footerHeight, false, true, null)
  }

  // 清理空页面
  if (!skipRemoveEmpty) {
    removeEmptyPages(container, headerHeight, footerHeight, pageHeight)
  }

  // 修正页面 top（预览模式跳过：由 flex 排布，强制绝对 top 会破坏布局）
  if (!skipFixTops) {
    fixPageTops(container, pageHeight)
  }

  // 阶段 3：清理 —— 恢复原始 DOM
  cleanupDataAttributes(container)
  pushElementsBelowGrownTables(container)

  // 移除标尺
  container.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())
}
