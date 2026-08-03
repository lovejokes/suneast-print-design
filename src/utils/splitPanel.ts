/**
 * 将超高的 panel 拆分为多个标准纸高的 panel，用于预览/打印/导出 PDF。
 * 支持在每页重复显示原始 panel 的页眉（paperHeader 区域内）和页脚（paperFooter 区域外）元素。
 *
 * 页尾线（paperFooter）只用于归类「哪些是页尾元素」，不参与页尾元素的定位。
 * 页尾元素按相对纸张底部的距离定位（与页码类似），拉高页尾线或改下边距都不应带动它们上移。
 *
 * 正文溢流边界取页尾元素落在单页上的最上沿（实际页尾占用带），而非页尾线位置。
 *
 * 注意：hiprint 新页 referenceElement.top = paperHeader，且 bottomInLastPaper=0，
 * getBeginPrintTop 对正文会算成 `options.top - paperHeader`。
 * 因此溢流起排必须用 `paperHeader + topOffset`，渲染后才是真正的上偏移。
 */

import { sealFakeTableTopBordersOnElements } from '@/utils/tableLayout'

/** 跨设计页溢流衔接时的最小段间距（pt） */
const CROSS_PAGE_LEAD = 24

/**
 * 将超高画布上的绝对 top 映射为单页上的 top：保持相对纸张底边的距离。
 */
function mapBottomAnchoredTop(
  originalTop: number,
  panelHPt: number,
  pageHPt: number,
  elHeight = 20,
): number {
  const distFromBottom = panelHPt - originalTop
  let top = pageHPt - distFromBottom
  if (top + elHeight > pageHPt) top = Math.max(0, pageHPt - elHeight)
  if (top < 0) top = 0
  return top
}

/**
 * 浮动叠层：仅认图片上的显式属性 floatOverlay / fixed。
 * 勾选后盖在其它元素上、不占排版；未勾选则按普通图片参与正文流。
 */
function isFloatingOverlay(el: any): boolean {
  const type = String(el?.printElementType?.type || '')
  if (type !== 'image') return false
  const o = el?.options
  if (!o) return false
  return !!(o.floatOverlay || o.fixed)
}

/** 位置固定（非浮动图）：矩形框等，按显示规则盖到对应打印页 */
function isFixedPositionElement(el: any): boolean {
  if (isFloatingOverlay(el)) return false
  return !!el?.options?.fixed
}

/**
 * 与 hiprint showInPage(pageIndex, pageCount) 对齐。
 * 空/默认 = 每一页都显示。
 */
function shouldShowOnPage(
  showInPage: unknown,
  pageIndex: number,
  pageCount: number,
): boolean {
  const n = showInPage == null || showInPage === '' ? '' : String(showInPage)
  if (!n) return true
  if (n === 'none') return false
  if (n === 'first') return pageIndex === 0
  if (n === 'last') return pageIndex === pageCount - 1
  if (n === 'odd') return pageIndex % 2 === 0
  if (n === 'even') return pageIndex % 2 === 1
  return true
}

/** 设计绝对 top → 单页内相对 top（同一高度钉到每一页） */
function toPageRelativeTop(absTop: number, pageHPt: number): number {
  if (!(pageHPt > 0)) return Math.max(0, absTop)
  let top = absTop % pageHPt
  if (top < 0) top += pageHPt
  // 浮点落在页缝上时归到 0
  if (Math.abs(top - pageHPt) < 0.05) top = 0
  return top
}

/** 预览前规范化：浮动图强制走 hiprint fixed，并保证层级 */
function normalizeOverlayOptions(el: any): any {
  const copy = JSON.parse(JSON.stringify(el))
  if (!copy.options) return copy
  copy.options.fixed = true
  copy.options.floatOverlay = true
  if (copy.options.zIndex == null || copy.options.zIndex === '') {
    copy.options.zIndex = 20
  }
  if (typeof copy.options.src === 'string') {
    copy.options.src = copy.options.src.trim()
  }
  return copy
}

/** 解析面板下偏移：模板未写时回退到 HIPRINT_CONFIG 默认值 */
function resolveBottomOffset(panel: any): number {
  const cfg = (window as any).HIPRINT_CONFIG?.panel?.default || {}
  if (panel?.bottomOffset != null && panel.bottomOffset !== '') {
    return Number(panel.bottomOffset) || 0
  }
  return Number(cfg.bottomOffset ?? 20) || 0
}

function resolveRightOffset(panel: any): number {
  const cfg = (window as any).HIPRINT_CONFIG?.panel?.default || {}
  if (panel?.rightOffset != null && panel.rightOffset !== '') {
    return Number(panel.rightOffset) || 0
  }
  return Number(cfg.rightOffset ?? 0) || 0
}

/**
 * 正文/表格可用底边 = min(页尾占用带, 纸高 - 下偏移 - trim)。
 * 页码落在下偏移带内，不参与上抬。
 */
function resolveContentFooterLine(opts: {
  pageHPt: number
  footerBandTop: number
  bottomOffset: number
  paperHeader?: number
}): number {
  const { pageHPt, footerBandTop, bottomOffset } = opts
  const trimMm =
    Number(
      (window as any).HIPRINT_CONFIG?.panel?.default?.paperHeightTrim ?? 1,
    ) || 0
  const hinnn = (window as any).hinnn
  const trimPt = trimMm > 0 && hinnn?.mm?.toPt ? hinnn.mm.toPt(trimMm) : 0
  const bottomLimit = pageHPt - Math.max(0, bottomOffset) - trimPt
  const line = Math.min(footerBandTop, bottomLimit)
  const header = Number(opts.paperHeader) || 0
  return Math.max(header + 40, line)
}

export function splitTallPanels(panels: any[], paperHeight: number): any[] {
  if (!paperHeight || paperHeight <= 0) return panels

  const hinnn = (window as any).hinnn
  const result: any[] = []

  panels.forEach((panel: any) => {
    const panelH: number = panel.height ?? paperHeight
    const originBottomOffset = resolveBottomOffset(panel)
    const originRightOffset = resolveRightOffset(panel)

    if (panelH <= paperHeight) {
      // 短面板不拆页；paperFooter 扣下偏移，避免表格续页铺到纸底
      const els: any[] = panel.printElements || []
      const next = els.map((el: any) =>
        isFloatingOverlay(el) ? normalizeOverlayOptions(el) : el,
      )
      const pageHPtShort = hinnn?.mm?.toPt(paperHeight) ?? 0
      const paperHeaderShort = Number(panel.paperHeader ?? 0) || 0
      const limit = resolveContentFooterLine({
        pageHPt: pageHPtShort,
        footerBandTop: pageHPtShort,
        bottomOffset: originBottomOffset,
        paperHeader: paperHeaderShort,
      })
      const paperFooter =
        pageHPtShort > 0
          ? Math.min(
              panel.paperFooter != null ? Number(panel.paperFooter) : limit,
              limit,
            )
          : panel.paperFooter
      sealFakeTableTopBordersOnElements(next)
      result.push({
        ...panel,
        paperFooter,
        bottomOffset: originBottomOffset,
        rightOffset: originRightOffset,
        printElements: next,
      })
      return
    }

    const minPageCount = Math.max(1, Math.round(panelH / paperHeight))
    const elements: any[] = panel.printElements || []
    const paperHeader: number = panel.paperHeader ?? 42
    // 仅用于归类页尾元素，不参与页尾定位
    const absoluteFooter: number = panel.paperFooter ?? paperHeader + 1
    const repeatHeaderFooter = panel.repeatHeaderFooter !== false
    const topOffset: number = Number(panel.topOffset ?? 0) || 0
    // 写入 options.top；经 hiprint reference 换算后视觉 top ≈ topOffset
    const overflowStartTop = paperHeader + topOffset

    const headerEls: any[] = []
    const footerEls: any[] = []
    const bodyEls: any[] = []

    elements.forEach((el: any) => {
      const top: number = el.options?.top ?? 0
      if (repeatHeaderFooter) {
        // 与 hiprint isHeaderOrFooter 一致：页眉带为 top < paperHeader
        if (top < paperHeader) {
          headerEls.push(el)
          return
        }
        // 页尾线只做收集：top >= paperFooter 视为页尾元素
        if (top >= absoluteFooter) {
          footerEls.push(el)
          return
        }
      }
      bodyEls.push(el)
    })

    // 浮动叠层（印章等）/ 位置固定元素：不进正文流，按规则落到对应页
    const overlayEls: any[] = []
    const pageFixedEls: any[] = []
    const flowBodyEls: any[] = []
    bodyEls.forEach((el: any) => {
      if (isFloatingOverlay(el)) {
        overlayEls.push(normalizeOverlayOptions(el))
      } else if (isFixedPositionElement(el)) {
        pageFixedEls.push(el)
      } else {
        flowBodyEls.push(el)
      }
    })

    const pageHPt = hinnn?.mm?.toPt(paperHeight) ?? 0
    const panelHPt = hinnn?.mm?.toPt(panelH) ?? pageHPt * minPageCount
    const pageWPt = hinnn?.mm?.toPt(panel.width ?? 210) ?? 0

    // 页尾元素按距底距离映射到单页；正文避让取这些位置的最上沿
    const footerTopsOnPage = footerEls.map((el: any) => {
      const originalTop: number = el.options?.top ?? 0
      const elH = parseFloat(el.options?.height) || 20
      return mapBottomAnchoredTop(originalTop, panelHPt, pageHPt, elH)
    })
    const footerBandTop =
      footerTopsOnPage.length > 0 ? Math.min(...footerTopsOnPage) : pageHPt

    // 页码坐标也按距底映射；超高画布上的 paperNumberTop 会超出单页高度导致跑出可视区
    const rawNumTop = Number(panel.paperNumberTop)
    const paperNumberTop = mapBottomAnchoredTop(
      rawNumTop > 0 ? rawNumTop : panelHPt - 22,
      panelHPt,
      pageHPt,
      22,
    )
    // 钉页码必须用「单页」距底间隙；若用超高画布间隙，会把页码 bottom 顶出纸外
    const paperNumberBottomGapPt = Math.max(0, pageHPt - paperNumberTop - 22)
    const rawNumLeft = Number(panel.paperNumberLeft)
    const paperNumberLeft =
      rawNumLeft > 0 && rawNumLeft < pageWPt
        ? rawNumLeft
        : Math.max(0, pageWPt - 30)

    // 正文/表格停行线：页尾占用带与下偏移取靠上者
    const contentFooterLine = resolveContentFooterLine({
      pageHPt,
      footerBandTop,
      bottomOffset: originBottomOffset,
      paperHeader,
    })

    /** 供预览分页后把页尾重新钉回每页底部（按距底间隙，等价于固定定位） */
    const pageFooterSpecs = footerEls.map((el: any) => {
      const originalTop: number = el.options?.top ?? 0
      const elH = parseFloat(el.options?.height) || 20
      return {
        title: String(el.options?.title || '').trim(),
        /** 元素底边到纸张底边的距离（pt） */
        bottomGapPt: Math.max(0, panelHPt - originalTop - elH),
        leftPt: Number(el.options?.left) || 0,
        heightPt: elH,
      }
    })

    /** 真正的页眉元素（设计 top < paperHeader），供预览标记，避免续页正文起排被误标成页眉 */
    const pageHeaderSpecs = headerEls.map((el: any) => ({
      title: String(el.options?.title || '').trim(),
      leftPt: Number(el.options?.left) || 0,
      topPt: Number(el.options?.top) || 0,
    }))

    const queue = flowBodyEls
      .map((el) => ({
        el: JSON.parse(JSON.stringify(el)),
        absTop: el.options?.top ?? 0,
        height: parseFloat(el.options?.height) || 0,
      }))
      .sort(
        (a, b) =>
          a.absTop - b.absTop ||
          (a.el.options?.left ?? 0) - (b.el.options?.left ?? 0),
      )

    const pageBodyBuckets: { el: any; absTop: number }[][] = []
    let qi = 0
    let pageIndex = 0

    while (qi < queue.length || pageIndex < minPageCount) {
      const pageTop = hinnn?.mm?.toPt(pageIndex * paperHeight) ?? pageIndex * pageHPt
      const pageBottom =
        hinnn?.mm?.toPt((pageIndex + 1) * paperHeight) ?? (pageIndex + 1) * pageHPt
      const footerLine = contentFooterLine
      const bucket: { el: any; absTop: number }[] = []

      let prevAbs = 0
      let prevTop = 0
      let prevH = 0
      let started = false

      while (qi < queue.length) {
        const item = queue[qi]

        if (
          !started &&
          pageIndex < minPageCount &&
          item.absTop >= pageBottom
        ) {
          break
        }

        let top: number
        let sameDesignPage = true
        if (!started) {
          if (item.absTop >= pageTop && item.absTop < pageBottom) {
            top = item.absTop - pageTop
            // 仅续页把首个元素抬到上偏移；首页若抬到 topOffset，会把后续非 fixed
            // 整链带偏，而 fixed 矩形仍绝对定位 → 预览里像「改标题带动了固定框」
            if (pageIndex > 0 && top < overflowStartTop) top = overflowStartTop
          } else {
            top = overflowStartTop
          }
          // 续页：正文贴上偏移起排。否则会把「相对该设计页纸顶的空白」
          // 整段带到预览（假表格/表格续行下方再分页时顶上出现大块空白）。
          if (pageIndex > 0) {
            top = overflowStartTop
          }
          started = true
        } else {
          sameDesignPage =
            Math.floor((prevAbs + 1e-6) / pageHPt) ===
            Math.floor((item.absTop + 1e-6) / pageHPt)
          if (sameDesignPage) {
            // 同设计页：默认保留画布绝对间距（拖动会改变空隙）
            top = prevTop + (item.absTop - prevAbs)
          } else {
            // 跨设计页缝落到同一预览页：
            // - 设计上贴合/叠边（假表格跨页缝）→ 保持 0 间距，勿注入段距
            // - 设计上本有空隙 → 压缩到 CROSS_PAGE_LEAD，避免把整页空白带进预览
            const designGap = Math.max(0, item.absTop - prevAbs - prevH)
            const lead = designGap <= 0.5 ? 0 : Math.min(designGap, CROSS_PAGE_LEAD)
            top = prevTop + prevH + lead
          }
          // 续页正文不要排进上偏移带；首页保留设计坐标（可拖入边距）
          if (pageIndex > 0 && top < overflowStartTop) top = overflowStartTop
        }

        const elH = item.height || parseFloat(item.el.options?.height) || 0
        const elType = item.el.printElementType?.type || ''
        // longText / table 可由 hiprint getHtml 按页脚线继续拆分，本页先落下
        const canFlowSplit = elType === 'longText' || elType === 'table' || String(elType).includes('table')

        // 若「保留设计空隙」会顶破页尾，但收紧段距后仍能放下，则收紧。
        // 避免拖大一点间距就把整节推到下一页、本页留下半页空白。
        // 设计贴合（假表格）时 tightLead=0，避免收紧逻辑反而撑开单线表。
        if (started && prevH > 0) {
          const designGap = Math.max(0, item.absTop - prevAbs - prevH)
          const tightLead =
            !sameDesignPage && designGap <= 0.5
              ? 0
              : Math.min(CROSS_PAGE_LEAD, 8)
          const tightTop = prevTop + prevH + tightLead
          const absWouldBreak =
            top >= footerLine || (!canFlowSplit && top + elH > footerLine)
          const tightFits =
            tightTop < footerLine &&
            (canFlowSplit || tightTop + elH <= footerLine)
          if (absWouldBreak && tightFits) {
            top = tightTop
          }
        }

        if (top >= footerLine) break

        if (top + elH > footerLine) {
          if (!canFlowSplit) {
            // 不可拆分：整段溢流到下一页
            break
          }
          // 可拆分：留在本页，高度收到页脚带为止，剩余由 hiprint 续排
          const clippedH = footerLine - top
          if (clippedH < 8) break
          // 本页只能放下很短一截时整段挪到下页，避免「半截重要提示 + 表单编号」独占稀疏尾页
          const minKeep = Math.min(56, Math.max(48, elH * 0.45))
          if (clippedH < minKeep) break
          item.el.options.height = clippedH
        }

        item.el.options.top = top
        bucket.push({ el: item.el, absTop: item.absTop })
        prevAbs = item.absTop
        prevTop = top
        prevH = parseFloat(item.el.options?.height) || elH
        qi += 1
      }

      pageBodyBuckets.push(bucket)
      pageIndex += 1

      if (qi >= queue.length && pageIndex >= minPageCount) break
      if (pageIndex > minPageCount + queue.length + 5) break
    }

    // 去掉正文已排完后仍按画布高度硬撑出来的空尾页（无浮动/固定元素占用时）
    while (pageBodyBuckets.length > 1) {
      const lastIdx = pageBodyBuckets.length - 1
      if (pageBodyBuckets[lastIdx].length > 0) break
      const pageTop =
        hinnn?.mm?.toPt(lastIdx * paperHeight) ?? lastIdx * pageHPt
      const pageBottom =
        hinnn?.mm?.toPt((lastIdx + 1) * paperHeight) ??
        (lastIdx + 1) * pageHPt
      const needsPage = [...overlayEls, ...pageFixedEls].some((el: any) => {
        if (!shouldShowOnPage(el.options?.showInPage, lastIdx, lastIdx + 1)) {
          return false
        }
        const absTop = Number(el.options?.top) || 0
        const elH = parseFloat(el.options?.height) || 0
        return absTop < pageBottom && absTop + elH > pageTop
      })
      if (needsPage) break
      pageBodyBuckets.pop()
    }

    const pageCount = pageBodyBuckets.length

    // leftOffset 不交给 content（设计 left 已是纸面坐标）。
    // topOffset 仍写入 panel：getHtml 会设 content.top，供预览对「贴顶续页块」
    // （表格分页等）选择性叠加；设计稿元素 top 已含边距则不叠。
    const originTopOffset = Number(panel.topOffset ?? 0) || 0

    for (let i = 0; i < pageCount; i++) {
      const pageHeaderElements = headerEls.map((el: any) =>
        JSON.parse(JSON.stringify(el)),
      )

      const pageFooterElements = footerEls.map((el: any, fi: number) => {
        const newEl = JSON.parse(JSON.stringify(el))
        if (newEl.options) {
          newEl.options.top = footerTopsOnPage[fi]
          // 固定页尾：不参与正文 reference 续排，始终按绝对 top 渲染
          newEl.options.fixed = true
        }
        return newEl
      })

      const pageTop =
        hinnn?.mm?.toPt(i * paperHeight) ?? i * pageHPt
      const pageBottom =
        hinnn?.mm?.toPt((i + 1) * paperHeight) ?? (i + 1) * pageHPt

      // 正文可能因 overflowStartTop 整体下移；浮动层必须用同一偏移，否则印章会偏上
      const bodyOnPage = pageBodyBuckets[i]
      let pageAbsShift = 0
      const shiftSample = bodyOnPage.find(
        (b) => b.absTop >= pageTop && b.absTop < pageBottom,
      )
      if (shiftSample) {
        pageAbsShift =
          (Number(shiftSample.el.options?.top) || 0) -
          (shiftSample.absTop - pageTop)
      }

      // 浮动层：落在本设计页纵带内的，映射为页内绝对 top；并尊重显示规则
      const pageFloatSpecs: FloatOverlaySpec[] = []
      const pageOverlayElements = overlayEls
        .filter((el: any) => {
          if (!shouldShowOnPage(el.options?.showInPage, i, pageCount)) return false
          const absTop = Number(el.options?.top) || 0
          const elH = parseFloat(el.options?.height) || 0
          // 与本页有纵向交集即放入（印章可能跨设计页缝）
          return absTop < pageBottom && absTop + elH > pageTop
        })
        .map((el: any) => {
          const newEl = JSON.parse(JSON.stringify(el))
          const absTop = Number(newEl.options?.top) || 0
          let top = absTop - pageTop + pageAbsShift
          const elH = parseFloat(newEl.options?.height) || 0
          // 尽量完整落在页内，避免被页尾线裁掉后看起来「没了」
          if (top + elH > contentFooterLine) {
            top = Math.max(overflowStartTop, contentFooterLine - elH)
          }
          if (top < 0) top = 0

          // 记录相对最近正文的设计偏移，供 getHtml/分页后贴齐
          let anchor: { absTop: number; left: number; title: string } | null =
            null
          let bestDist = Infinity
          let bestOverlap: typeof anchor = null
          let bestOverlapDist = Infinity
          const elHAbs = elH
          for (const b of bodyOnPage) {
            const bt = b.absTop
            const bh = parseFloat(b.el.options?.height) || 20
            const d = Math.abs(bt - absTop)
            const title = String(
              b.el.options?.title || b.el.options?.field || '',
            ).trim()
            const left = Number(b.el.options?.left) || 0
            if (d < bestDist) {
              bestDist = d
              anchor = { absTop: bt, left, title }
            }
            if (bt < absTop + elHAbs && bt + bh > absTop && d < bestOverlapDist) {
              bestOverlapDist = d
              bestOverlap = { absTop: bt, left, title }
            }
          }
          const useAnchor = bestOverlap || anchor
          if (useAnchor) {
            pageFloatSpecs.push({
              leftPt: Number(newEl.options?.left) || 0,
              widthPt: parseFloat(newEl.options?.width) || 0,
              anchorLeftPt: useAnchor.left,
              anchorTitle: useAnchor.title,
              dyPt: absTop - useAnchor.absTop,
            })
          }

          newEl.options.top = top
          newEl.options.fixed = true
          // 已按规则挑过页；每个拆页 panel 通常一页，用 first 避免同 panel 内再盖
          newEl.options.showInPage = 'first'
          return newEl
        })

      // 位置固定（矩形等）：按显示规则钉到对应页同一高度（默认=每一页）
      const pageFixedElements = pageFixedEls
        .filter((el: any) =>
          shouldShowOnPage(el.options?.showInPage, i, pageCount),
        )
        .map((el: any) => {
          const newEl = JSON.parse(JSON.stringify(el))
          const absTop = Number(newEl.options?.top) || 0
          let top = toPageRelativeTop(absTop, pageHPt)
          const elH = parseFloat(newEl.options?.height) || 0
          if (top + elH > contentFooterLine) {
            top = Math.max(overflowStartTop, contentFooterLine - elH)
          }
          if (top < 0) top = 0
          newEl.options.top = top
          newEl.options.fixed = true
          newEl.options.showInPage = 'first'
          return newEl
        })

      const pageBodyEls = bodyOnPage.map((b) => b.el)
      // 假表格跨页后，续页首行补回顶边（设计去重时非首行无 borderTop）
      sealFakeTableTopBordersOnElements(pageBodyEls)
      result.push({
        ...panel,
        index: result.length,
        name: result.length + 1,
        height: paperHeight,
        paperHeader,
        paperFooter: contentFooterLine,
        paperNumberTop,
        paperNumberLeft,
        topOffset: originTopOffset,
        leftOffset: 0,
        // 续页也保留下/右偏移，供 paperFooter 与后续逻辑避让页边
        bottomOffset: originBottomOffset,
        rightOffset: originRightOffset,
        // 预览分页后用于钉住页尾 / 页码
        __pageFooterSpecs: pageFooterSpecs,
        __pageHeaderSpecs: pageHeaderSpecs,
        __paperNumberBottomGapPt: paperNumberBottomGapPt,
        __floatOverlaySpecs: pageFloatSpecs,
        printElements: [
          ...pageHeaderElements,
          ...pageBodyEls,
          ...pageOverlayElements,
          ...pageFixedElements,
          ...pageFooterElements,
        ],
      })
    }
  })

  return result
}

export type PageFooterSpec = {
  title: string
  /** 元素底边到纸张底边的距离（pt）——用 CSS bottom 钉住，不受分页改 top 影响 */
  bottomGapPt: number
  leftPt: number
  heightPt?: number
}

export type PageHeaderSpec = {
  title: string
  leftPt: number
  topPt: number
}

/** 浮动叠层相对正文锚点的设计偏移，用于 getHtml/分页后贴齐 */
export type FloatOverlaySpec = {
  leftPt: number
  widthPt: number
  anchorLeftPt: number
  anchorTitle: string
  dyPt: number
}

/**
 * 按拆页时记录的相对偏移，把浮动图贴回锚点正文（解决 hiprint 正文重排后印章错位）。
 */
export function snapFloatOverlays(
  container: HTMLElement,
  specs: FloatOverlaySpec[],
): void {
  if (!container || !specs.length) return
  const hinnn = (window as any).hinnn
  const ptToPx = (pt: number) =>
    hinnn?.pt?.toPx ? hinnn.pt.toPx(pt) : (pt * 96) / 72
  const parseLen = (raw: string) => {
    if (!raw) return NaN
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return NaN
    if (raw.includes('pt')) return ptToPx(n)
    return n
  }

  const papers = Array.from(
    container.querySelectorAll('.hiprint-printPaper'),
  ) as HTMLElement[]

  papers.forEach((paper) => {
    const host =
      (paper.querySelector('.hiprint-printPaper-content') as HTMLElement) ||
      paper
    const nodes = Array.from(
      host.querySelectorAll('.hiprint-printElement'),
    ) as HTMLElement[]

    specs.forEach((spec) => {
      const img = nodes.find((el) => {
        if (!el.classList.contains('hiprint-printElement-image')) return false
        const left = parseLen(el.style.left || '')
        return Number.isFinite(left) && Math.abs(left - ptToPx(spec.leftPt)) < 2
      })
      if (!img) return

      const norm = (s: string) => s.replace(/[\s\u2000-\u200b\u3000  ]/g, '')
      const wantTitle = norm(spec.anchorTitle)
      let anchor: HTMLElement | null = null
      if (wantTitle) {
        anchor =
          nodes.find((el) => {
            if (el.classList.contains('hiprint-printElement-image')) return false
            const t = norm(el.innerText || '')
            return t.includes(wantTitle) || wantTitle.includes(t.slice(0, 4))
          }) || null
      }
      if (!anchor) {
        const wantLeft = ptToPx(spec.anchorLeftPt)
        let best: HTMLElement | null = null
        let bestDist = Infinity
        nodes.forEach((el) => {
          if (el.classList.contains('hiprint-printElement-image')) return
          const left = parseLen(el.style.left || '')
          if (!Number.isFinite(left)) return
          const d = Math.abs(left - wantLeft)
          if (d < bestDist) {
            bestDist = d
            best = el
          }
        })
        anchor = best
      }
      if (!anchor) return

      const aTop = parseLen(anchor.style.top || '')
      if (!Number.isFinite(aTop)) return
      const newTop = aTop + ptToPx(spec.dyPt)
      img.style.top = `${newTop}px`
      img.setAttribute('data-page-overlay', '1')
    })
  })
}

/**
 * 把拆页得到的真实页眉元素打上 data-page-header，避免仅凭 CSS top
 * 把续页正文起排（常为 paperHeader 附近）误判成页眉。
 */
export function markPageHeaders(
  container: HTMLElement,
  specs: PageHeaderSpec[],
): void {
  if (!container || !specs.length) return
  const papers = Array.from(
    container.querySelectorAll('.hiprint-printPaper'),
  ) as HTMLElement[]
  if (!papers.length) return

  const uniq = new Map<string, PageHeaderSpec>()
  specs.forEach((s) => {
    const key = `${s.title}@@${s.leftPt}@@${s.topPt}`
    if (!uniq.has(key)) uniq.set(key, s)
  })
  const list = Array.from(uniq.values())

  for (const paper of papers) {
    const els = Array.from(
      paper.querySelectorAll('.hiprint-printElement'),
    ) as HTMLElement[]
    for (const spec of list) {
      const el = els.find((node) => {
        if (node.classList.contains('hiprint-paperNumber')) return false
        if (node.getAttribute('data-page-footer') === '1') return false
        const left = parseFloat(node.style.left) || 0
        const top = parseFloat(node.style.top) || 0
        const text = (node.textContent || '').trim()
        const leftOk = Math.abs(left - spec.leftPt) < 1.5
        const topOk = Math.abs(top - spec.topPt) < 1.5
        if (spec.title) {
          const titleOk =
            text === spec.title ||
            text.includes(spec.title.slice(0, Math.min(12, spec.title.length)))
          // 页眉渲染后 top 仍是设计绝对 top；优先 title+left，top 作辅助
          return titleOk && (leftOk || topOk)
        }
        return leftOk && topOk
      })
      if (el) el.setAttribute('data-page-header', '1')
    }
  }
}

/**
 * 分页（含 longText 溢出页）之后，把页尾重新钉到每页底部。
 * 用 position:absolute + bottom，等价于固定在纸张底部，不随正文续排/压缩偏移。
 */
export function pinPageFooters(
  container: HTMLElement,
  specs: PageFooterSpec[],
  paperNumberBottomGapPt?: number,
): void {
  if (!container) return
  const papers = Array.from(
    container.querySelectorAll('.hiprint-printPaper'),
  ) as HTMLElement[]
  if (!papers.length) return

  const uniq = new Map<string, PageFooterSpec>()
  specs.forEach((s) => {
    const key = `${s.title}@@${s.leftPt}`
    if (!uniq.has(key)) uniq.set(key, s)
  })
  const list = Array.from(uniq.values())
  if (!list.length && paperNumberBottomGapPt == null) return

  const refs = new Map<string, HTMLElement>()

  function matchKey(spec: PageFooterSpec) {
    return `${spec.title}@@${spec.leftPt}`
  }

  function findFooter(paper: HTMLElement, spec: PageFooterSpec): HTMLElement | null {
    const els = Array.from(
      paper.querySelectorAll('.hiprint-printElement'),
    ) as HTMLElement[]
    const title = spec.title
    if (title) {
      const byText = els.find((el) => {
        if (el.classList.contains('hiprint-paperNumber')) return false
        const t = (el.textContent || '').trim()
        return t === title || t.includes(title.slice(0, Math.min(12, title.length)))
      })
      if (byText) return byText
    }
    // 无标题：按 left 接近 + 靠近页底
    const paperH = paper.getBoundingClientRect().height
    return (
      els.find((el) => {
        if (el.classList.contains('hiprint-paperNumber')) return false
        const left = parseFloat(el.style.left) || 0
        const topPx =
          el.getBoundingClientRect().top - paper.getBoundingClientRect().top
        const leftOk = Math.abs(left - spec.leftPt) < 30
        return leftOk && topPx > paperH * 0.75
      }) || null
    )
  }

  function pinBottom(el: HTMLElement, bottomGapPt: number, leftPt?: number) {
    el.style.position = 'absolute'
    el.style.setProperty('top', 'auto', 'important')
    el.style.setProperty('bottom', `${Math.max(0, bottomGapPt)}pt`, 'important')
    if (leftPt != null) {
      el.style.setProperty('left', `${leftPt}pt`, 'important')
    }
  }

  // 收集可克隆的页尾原型
  for (const paper of papers) {
    for (const spec of list) {
      const key = matchKey(spec)
      if (refs.has(key)) continue
      const el = findFooter(paper, spec)
      if (el) refs.set(key, el.cloneNode(true) as HTMLElement)
    }
  }

  for (const paper of papers) {
    const content =
      (paper.querySelector('.hiprint-printPaper-content') as HTMLElement) || paper

    // content 必须相对定位，bottom 才相对纸张内容区
    if (window.getComputedStyle(content).position === 'static') {
      content.style.position = 'relative'
    }

    for (const spec of list) {
      const key = matchKey(spec)
      let el = findFooter(paper, spec)
      if (!el) {
        const proto = refs.get(key)
        if (!proto) continue
        el = proto.cloneNode(true) as HTMLElement
        content.appendChild(el)
      }
      el.setAttribute('data-page-footer', '1')
      // 外层钉高度；内层必须保持 height:100%，否则 middle 垂直居中（grid/flex）会失效显得偏上
      if (spec.heightPt != null && spec.heightPt > 0) {
        el.style.setProperty('height', `${spec.heightPt}pt`, 'important')
      }
      const inner = el.querySelector('.hiprint-printElement-content') as HTMLElement | null
      if (inner) {
        inner.style.setProperty('height', '100%', 'important')
        inner.style.setProperty('width', '100%', 'important')
      }
      pinBottom(el, spec.bottomGapPt, spec.leftPt)
    }

    if (paperNumberBottomGapPt != null && Number.isFinite(paperNumberBottomGapPt)) {
      const num = paper.querySelector('.hiprint-paperNumber') as HTMLElement | null
      if (num) {
        pinBottom(num, paperNumberBottomGapPt)
      }
    }
  }
}
