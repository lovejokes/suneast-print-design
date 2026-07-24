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

function preprocessHiprintDOM(container: HTMLElement): void {
  const papers = getPapers(container)

  papers.forEach((paper, pageIdx) => {
    const children = Array.from(paper.children) as HTMLElement[]
    const toWrap: { el: HTMLElement; top: number; height: number }[] = []

    for (const child of children) {
      if (child.hasAttribute('data-print-wrapper')) continue
      if (child.classList.contains('hiprint_rul_wrapper')) continue

      const computed = window.getComputedStyle(child)
      const pos = computed.position || ''
      if (pos !== 'absolute' && pos !== 'fixed') continue

      const paperRect = paper.getBoundingClientRect()
      const childRect = child.getBoundingClientRect()
      const top = childRect.top - paperRect.top
      const h = childRect.height
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

      const paperRect = paper.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      wrapper.style.position = 'absolute'
      wrapper.style.top = `${elRect.top - paperRect.top}px`
      wrapper.style.left = `${elRect.left - paperRect.left}px`
      wrapper.style.width = `${elRect.width}px`
      wrapper.style.height = `${elRect.height}px`

      el.style.position = ''
      el.style.top = ''
      el.style.left = ''
      el.style.width = '100%'
      el.style.height = '100%'

      paper.insertBefore(wrapper, el)
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

function createOverflowPage(
  container: HTMLElement,
  papers: HTMLElement[],
  currentIdx: number,
): HTMLElement {
  const currentPaper = papers[currentIdx]
  const panel = currentPaper.parentElement as HTMLElement | null

  const newPaper = document.createElement('div')
  newPaper.className = currentPaper.className
  newPaper.style.cssText = currentPaper.style.cssText
  newPaper.style.overflow = 'hidden'
  newPaper.style.background = '#ffffff'
  newPaper.innerHTML = ''

  if (panel) {
    if (currentIdx === papers.length - 1) {
      panel.appendChild(newPaper)
    } else {
      const nextPaper = papers[currentIdx + 1]
      // 跨 panel 场景：nextPaper 不在当前 panel 内，追加到当前 panel 末尾
      if (nextPaper.parentElement === panel) {
        panel.insertBefore(newPaper, nextPaper)
      } else {
        panel.appendChild(newPaper)
      }
    }
  } else {
    container.appendChild(newPaper)
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
      const finalBottomInPage = viewportYToPageY(paperRect, contentRect.bottom, pageHeight)
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

      const anchors = anchorsByOrigin.get(originPage)
      const origTop = getOriginalTop(wrapper)
      const storedH = parseAttr(wrapper, 'data-original-height', -1)
      const origH = storedH >= 0 ? storedH : elHeight(wrapper)
      const origBottom = origTop + origH

      const isHeader = headerHeight > 0 && origTop < headerHeight + marginTop
      const isFooter = footerHeight > 0 && origTop >= pageHeight - footerHeight - marginBottom
      if (isHeader || isFooter) return

      const curTop = parseFloat(wrapper.style.top || '') || 0
      const curParent = wrapper.parentElement as HTMLElement | null
      let curPageIdx = curParent
        ? (pageIndexMap.get(curParent) ?? papers.indexOf(curParent))
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
      const didMovePage = wrapper.parentElement !== targetPaper
      const didMoveTop = Math.abs(prevTop - targetTop) > 0.1

      if (wrapper.parentElement !== targetPaper) {
        targetPaper.appendChild(wrapper)
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
  const minTop = effectiveHeaderHeight

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
      if (wrapper.parentElement !== paper) continue
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
            newPage.appendChild(wrapper)
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
        newPage.appendChild(newWrapper)

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
        newPage.appendChild(wrapper)
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

        newPage.appendChild(newWrapper)
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
      // 如果 panel 内没有剩余的 paper，也清理掉 panel
      if (panel && panel.querySelectorAll('.hiprint-printPaper').length === 0) {
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

function cleanupDataAttributes(container: HTMLElement): void {
  const wrappers = Array.from(
    container.querySelectorAll('[data-print-wrapper]'),
  ) as HTMLElement[]

  // 第一遍：收集所有 wrapper → paper 映射，同时处理已连接到 DOM 的 wrapper
  const orphanWrappers: HTMLElement[] = []

  for (const wrapper of wrappers) {
    const paper = wrapper.parentElement
    if (!paper) {
      orphanWrappers.push(wrapper)
      continue
    }

    const children = Array.from(wrapper.children) as HTMLElement[]
    for (const child of children) {
      child.style.position = wrapper.style.position || 'absolute'
      child.style.top = wrapper.style.top || ''
      child.style.left = wrapper.style.left || ''
      child.style.width = wrapper.style.width || ''
      child.style.height = wrapper.style.height || ''

      paper.insertBefore(child, wrapper)
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
          child.style.top = wrapper.style.top || ''
          child.style.left = wrapper.style.left || ''
          child.style.width = wrapper.style.width || ''
          child.style.height = wrapper.style.height || ''

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
    htmlEl.removeAttribute('data-text-content')
    htmlEl.removeAttribute('data-align-offset-y')
    htmlEl.style.paddingTop = ''
  })
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* 主入口                                                                */
/* ═══════════════════════════════════════════════════════════════════════ */

export function handleTextPagination(container: HTMLElement): void {
  const papers = getPapers(container)
  if (papers.length === 0) return

  const pageHeight = papers[0].getBoundingClientRect().height
  if (pageHeight <= 0) return

  // hiprint 没有页眉/页脚概念
  const headerHeight = 0
  const footerHeight = 0

  // 记录原始页数，判断是否有流式内容需要分页
  const originalPaperCount = papers.length

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

  // 检查分页是否真的产生了新页面
  const papersAfterFlow = getPapers(container)
  const flowCreatedPages = papersAfterFlow.length > originalPaperCount

  // 阶段 2：最终收敛 —— 仅在流式分页确实改变了页面布局时才重排固定元素
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
  removeEmptyPages(container, headerHeight, footerHeight, pageHeight)

  // 修正页面 top
  fixPageTops(container, pageHeight)

  // 阶段 3：清理 —— 恢复原始 DOM
  cleanupDataAttributes(container)

  // 移除标尺
  container.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())
}
