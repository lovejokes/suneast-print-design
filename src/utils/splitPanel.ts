/**
 * 将超高的 panel 拆分为多个标准纸高的 panel，用于预览/打印/导出 PDF。
 * 支持在每页重复显示原始 panel 的页眉（paperHeader 区域内）和页脚（paperFooter 区域外）元素。
 */
export function splitTallPanels(panels: any[], paperHeight: number): any[] {
  if (!paperHeight || paperHeight <= 0) return panels

  const hinnn = (window as any).hinnn
  const result: any[] = []

  panels.forEach((panel: any) => {
    const panelH: number = panel.height ?? paperHeight
    if (panelH <= paperHeight) {
      result.push(panel)
      return
    }

    const pageCount = Math.round(panelH / paperHeight)
    const elements: any[] = panel.printElements || []
    const paperHeader: number = panel.paperHeader ?? 42
    const paperFooter: number = panel.paperFooter ?? paperHeader + 1
    const repeatHeaderFooter = panel.repeatHeaderFooter !== false

    // 提前区分：页眉区、正文区、页脚区元素
    const headerEls: any[] = []
    const footerEls: any[] = []
    const bodyEls: any[] = []

    elements.forEach((el: any) => {
      const top: number = el.options?.top ?? 0
      if (repeatHeaderFooter) {
        // 页眉区：paperHeader 线及以上；页脚区：paperFooter 线及以下
        if (top <= paperHeader) {
          headerEls.push(el)
          return
        }
        if (top >= paperFooter) {
          footerEls.push(el)
          return
        }
      }
      bodyEls.push(el)
    })

    // 提前计算页尾区域所需的最大空间（偏移量 + 元素高度），
    // 用于在页脚线超出单页高度时正确放置页脚线，确保页尾元素能完整显示。
    let maxFooterExtent = 0
    footerEls.forEach((el: any) => {
      const originalTop = el.options?.top ?? 0
      const footerOffset = originalTop - paperFooter
      const elHeight = parseFloat(el.options?.height) || 20
      maxFooterExtent = Math.max(maxFooterExtent, footerOffset + elHeight)
    })

    for (let i = 0; i < pageCount; i++) {
      const pageTopMm = i * paperHeight
      const pageTop = hinnn?.mm?.toPt(pageTopMm) ?? 0
      const pageBottom = hinnn?.mm?.toPt((i + 1) * paperHeight) ?? 0

      // 当前页 paperFooter 线位置
      const pageHPt = hinnn?.mm?.toPt(paperHeight) ?? 0
      let newPaperFooter: number | undefined
      if (panel.paperFooter != null) {
        if (panel.paperFooter >= pageHPt) {
          // 页脚线超出单页高度：将页脚线放置在页底，预留页尾元素空间
          const safeHeight = Math.min(maxFooterExtent + 1, Math.max(pageHPt - paperHeader - 2, 0))
          newPaperFooter = Math.max(pageHPt - safeHeight, paperHeader + 1)
        } else {
          // 页脚线在单页内：保持原位置
          newPaperFooter = panel.paperFooter
        }
      }

      // 正文元素：筛选属于当前页的元素，并调整为页内相对位置。
      // 若元素底部超出 paperFooter 线，裁剪高度避免与页尾区域重叠。
      const pageBodyElements = bodyEls
        .filter((el: any) => {
          const top: number = el.options?.top ?? 0
          return top >= pageTop && top < pageBottom
        })
        .map((el: any) => {
          const newEl = JSON.parse(JSON.stringify(el))
          if (newEl.options?.top != null) {
            newEl.options.top -= pageTop
          }
          if (newPaperFooter != null && newEl.options) {
            const elH = newEl.options.height ?? 0
            const elBottom = (newEl.options.top ?? 0) + elH
            if (elBottom > newPaperFooter) {
              const clippedH = newPaperFooter - (newEl.options.top ?? 0)
              if (clippedH <= 0) return null
              newEl.options.height = clippedH
            }
          }
          return newEl
        })
        .filter(Boolean)

      // 页眉元素：每页复制一份，top 保持原位置（每个子 panel 顶部都视为页面顶部）
      const pageHeaderElements = headerEls.map((el: any) => JSON.parse(JSON.stringify(el)))

      // 页脚元素：每页复制一份，依据当前页 paperFooter 线重新计算 top。
      // newPaperFooter 已预留页尾区域空间，无需额外钳位。
      const pageFooterElements = footerEls.map((el: any) => {
        const newEl = JSON.parse(JSON.stringify(el))
        const originalTop: number = el.options?.top ?? 0
        const footerOffset = originalTop - paperFooter
        if (newEl.options && newPaperFooter != null) {
          newEl.options.top = newPaperFooter + footerOffset
        }
        return newEl
      })

      result.push({
        ...panel,
        index: result.length,
        name: result.length + 1,
        height: paperHeight,
        paperHeader,
        paperFooter: newPaperFooter,
        printElements: [...pageHeaderElements, ...pageBodyElements, ...pageFooterElements],
      })
    }
  })

  return result
}
