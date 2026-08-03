import { splitTallPanels, pinPageFooters, markPageHeaders, snapFloatOverlays, type PageFooterSpec, type PageHeaderSpec, type FloatOverlaySpec } from '@/utils/splitPanel'
import { handleTextPagination } from '@/utils/pagination'
import { sealFakeTableTopBordersInContainer } from '@/utils/tableLayout'

/**
 * 与打印预览相同的渲染管线：拆页 → getHtml → 文本分页 → 钉页尾。
 */
export function renderPreviewPages(
  container: HTMLElement,
  template: object,
  data: object,
  paperHeight?: number,
): { pageCount: number; dispose: () => void } {
  const templateCopy = JSON.parse(JSON.stringify(template))
  const dataCopy = JSON.parse(JSON.stringify(data))

  let footerSpecs: PageFooterSpec[] = []
  let headerSpecs: PageHeaderSpec[] = []
  let floatSpecs: FloatOverlaySpec[] = []
  let pinnedPaperNumberBottomGap: number | undefined
  /** 拆页路径会写入 __pageHeaderSpecs（可为 []）；短面板不写，仍走 CSS 回退 */
  let headerSpecsFromSplit = false
  if (paperHeight && templateCopy.panels) {
    templateCopy.panels = splitTallPanels(templateCopy.panels, paperHeight)
    templateCopy.panels.forEach((p: any) => {
      if (Array.isArray(p.__pageFooterSpecs)) {
        footerSpecs.push(...p.__pageFooterSpecs)
      }
      if (Array.isArray(p.__pageHeaderSpecs)) {
        headerSpecsFromSplit = true
        headerSpecs.push(...p.__pageHeaderSpecs)
      }
      if (Array.isArray(p.__floatOverlaySpecs)) {
        floatSpecs.push(...p.__floatOverlaySpecs)
      }
      if (
        p.__paperNumberBottomGapPt != null &&
        pinnedPaperNumberBottomGap == null
      ) {
        pinnedPaperNumberBottomGap = Number(p.__paperNumberBottomGapPt)
      }
      // 清掉按页脚覆盖，避免 hiprint getPaperFooter 用旧值盖过拆页后的 paperFooter
      // （否则续页表格仍会铺到纸底，出现半行被裁）
      delete p.firstPaperFooter
      delete p.evenPaperFooter
      delete p.oddPaperFooter
      delete p.lastPaperFooter
      delete p.__pageFooterSpecs
      delete p.__pageHeaderSpecs
      delete p.__floatOverlaySpecs
      delete p.__paperNumberBottomGapPt
    })
  }

  const hiprint = (window as any).hiprint
  const $ = (window as any).$
  if (!hiprint || !$) {
    throw new Error('hiprint 未加载')
  }

  const pt = new hiprint.PrintTemplate({ template: templateCopy })
  const $result = $('<div class="hiprint-printTemplate"></div>')
  const panels = pt.printPanels || []
  const allPages: any[] = []

  panels.forEach((panel: any) => {
    const localPages: any[] = []
    const target = panel.getHtml(dataCopy, {}, localPages)
    if (target) $result.append(target)
    allPages.push(...localPages)
  })

  $(container).empty().append($result)

  // 分页前记下表格与下方元素的设计间距（getHtml 后 height 会被撑开，不能再从 style 反推）
  const hinnnStamp = (window as any).hinnn
  const leftToPx = (raw: string) => {
    if (!raw) return NaN
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return NaN
    if (raw.includes('pt') && hinnnStamp?.pt?.toPx) return hinnnStamp.pt.toPx(n)
    if (raw.includes('pt')) return n * (96 / 72)
    return n
  }
  const tableSpecs: { leftPt: number; topPt: number; hPt: number; gapPx: number }[] =
    []
  ;((templateCopy as any)?.panels || []).forEach((panel: any) => {
    const els = panel.printElements || []
    els.forEach((el: any) => {
      if (!String(el.printElementType?.type || '').toLowerCase().includes('table')) {
        return
      }
      const leftPt = Number(el.options?.left) || 0
      const hPt = Number(el.options?.height) || 0
      const topPt = Number(el.options?.top) || 0
      if (!(hPt > 0)) return
      let nextTopPt = Infinity
      for (const other of els) {
        if (other === el) continue
        const ot = Number(other.options?.top)
        if (!Number.isFinite(ot)) continue
        if (ot >= topPt + hPt - 0.5 && ot < nextTopPt) nextTopPt = ot
      }
      if (!(nextTopPt < Infinity)) return
      const gapPt = nextTopPt - (topPt + hPt)
      if (gapPt < 0) return
      const gapPx = hinnnStamp?.pt?.toPx
        ? hinnnStamp.pt.toPx(gapPt)
        : gapPt * (96 / 72)
      tableSpecs.push({ leftPt, topPt, hPt, gapPx })
    })
  })
  container.querySelectorAll('.hiprint-printElement-table').forEach((node) => {
    const dom = node as HTMLElement
    const raw = dom.style.left || ''
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return
    const leftPx = leftToPx(raw)
    const spec = tableSpecs.find(
      (s) =>
        Math.abs(n - s.leftPt) < 1 ||
        Math.abs(leftPx - leftToPx(`${s.leftPt}pt`)) < 3,
    )
    if (spec) dom.setAttribute('data-design-gap-px', String(spec.gapPx))
  })

  const paperHeaderPt = Number(
    (templateCopy as any)?.panels?.[0]?.paperHeader ?? 0,
  ) || 0

  // 先按拆页得到的真实页眉规格打标。
  // 已拆页时即使没有页眉也不走 CSS top 回退，避免续页正文起排被误标。
  if (headerSpecs.length) {
    markPageHeaders(container, headerSpecs)
  } else if (!headerSpecsFromSplit && paperHeaderPt > 0) {
    container.querySelectorAll('.hiprint-printPaper').forEach((paper) => {
      const contentEl = paper.querySelector('.hiprint-printPaper-content') || paper
      Array.from(contentEl.children).forEach((child) => {
        const node = child as HTMLElement
        const top = parseFloat(node.style.top) || 0
        if (node.style.top?.includes('pt') && top < paperHeaderPt) {
          node.setAttribute('data-page-header', '1')
        }
      })
    })
  }

  // 分页前处理 content 偏移：
  // 设计态会清掉 content 的 left/top，元素 options 已是纸面绝对坐标。
  // getHtml 仍会写 content.top=topOffset：
  // - 首页设计元素 top 已含上边距 → 不能再叠，否则翻倍
  // - 表格/文本续页块常从 paperHeader（或 0）贴顶起排 → 需要叠加上偏移
  const panel0 = (templateCopy as any)?.panels?.[0]
  const topOffsetPt =
    Number(
      panel0?.topOffset ??
        (window as any).HIPRINT_CONFIG?.panel?.default?.topOffset ??
        0,
    ) || 0
  const paperHeaderPtForOffset = Number(panel0?.paperHeader ?? 0) || 0

  const normalizePaper = (
    paper: Element,
    opts: { bakeTopOffset?: boolean } = {},
  ) => {
    const el = paper as HTMLElement
    el.style.overflow = 'hidden'
    el.style.background = '#ffffff'
    const contentEl = el.querySelector('.hiprint-printPaper-content') as HTMLElement | null
    if (contentEl) {
      const hinnn = (window as any).hinnn
      const parsePt = (raw: string) => {
        if (!raw) return 0
        const n = parseFloat(raw)
        if (!Number.isFinite(n)) return 0
        if (raw.includes('px') && hinnn?.px?.toPt) return hinnn.px.toPt(n)
        return n
      }
      // 只认 getHtml 写在 content 上的 top，禁止用配置值兜底二次烘焙
      const topOff = opts.bakeTopOffset ? parsePt(contentEl.style.top || '') : 0
      if (topOff > 0) {
        const headerLine = paperHeaderPtForOffset
        const candidates: { node: HTMLElement; cur: number }[] = []
        Array.from(contentEl.children).forEach((child) => {
          const node = child as HTMLElement
          const cs = window.getComputedStyle(node)
          if (cs.position !== 'absolute' && cs.position !== 'fixed') return
          if (node.classList.contains('hiprint-paperNumber')) return
          if (node.classList.contains('hiprint_rul_wrapper')) return
          if (node.classList.contains('element-wrapper')) return
          if (node.getAttribute('data-page-footer') === '1') return
          if (node.getAttribute('data-page-header') === '1') return
          if (node.getAttribute('data-top-offset-applied') === '1') return
          candidates.push({ node, cur: parsePt(node.style.top || '') })
        })
        // 续页/溢流页：hiprint 按 options.top - paperHeader 起排，视觉依赖 content.top。
        // 清掉 content 时若只抬「贴页眉线」的块，同页后续正文会少一段上偏移而重叠
        // （如「五、开箱」与下方 longText 同 top）。有贴顶续页块则整页正文一起叠。
        // 首页正文远低于页眉线：不叠，避免与已含边距的设计坐标翻倍。
        const hasFlushContinuation = candidates.some(
          ({ cur }) => cur <= headerLine + 0.75,
        )
        for (const { node, cur } of candidates) {
          if (!hasFlushContinuation) continue
          node.style.top = `${cur + topOff}pt`
          node.setAttribute('data-top-offset-applied', '1')
        }
      }
      contentEl.style.position = 'relative'
      contentEl.style.left = '0pt'
      contentEl.style.top = '0pt'
      contentEl.style.bottom = ''
      contentEl.style.right = ''
      contentEl.style.width = '100%'
      contentEl.style.height = '100%'
      contentEl.style.minHeight = '100%'
      contentEl.style.overflow = 'visible'
    }
  }

  container.querySelectorAll('.hiprint-printPaper').forEach((paper) => {
    normalizePaper(paper, { bakeTopOffset: true })
  })

  // 供分页回填识别下偏移 / 续页上偏移
  const bottomOffsetPt =
    Number(
      panel0?.bottomOffset ??
        (window as any).HIPRINT_CONFIG?.panel?.default?.bottomOffset ??
        0,
    ) || 0
  container.querySelectorAll('.hiprint-printPaper').forEach((paper) => {
    const p = paper as HTMLElement
    if (bottomOffsetPt > 0) {
      p.setAttribute('data-bottom-offset-pt', String(bottomOffsetPt))
    }
    if (topOffsetPt > 0) {
      p.setAttribute('data-top-offset-pt', String(topOffsetPt))
    }
  })

  // getHtml 后按设计相对偏移贴齐浮动图，并打上 data-page-overlay 供分页跳过
  if (floatSpecs.length) {
    snapFloatOverlays(container, floatSpecs)
  }

  // 必须在分页/回填空白之前钉住页尾并打标。
  // 否则「商城」等页尾仍是普通 absolute 正文，getBodyContentBottom 会当成页已写满，
  // compactOverflowPageBlanks 不再把下一页（如「五、开箱」）拉回，页底留下大块空白。
  pinPageFooters(container, footerSpecs, pinnedPaperNumberBottomGap)

  handleTextPagination(container, {
    skipFixTops: true,
    skipRemoveEmpty: true,
  })

  // 表格/流式分页可能再搬格：续页假表格首行补顶边
  sealFakeTableTopBordersInContainer(container)

  // 分页后正文 top 可能变化，再贴一次
  if (floatSpecs.length) {
    snapFloatOverlays(container, floatSpecs)
  }

  const papers = container.querySelectorAll('.hiprint-printPaper')
  papers.forEach((paper: Element) => {
    // 分页后只清 content 偏移，不再烘焙（避免二次叠加 / 误伤已定位元素）
    normalizePaper(paper, { bakeTopOffset: false })
    Array.from(paper.children).forEach((child) => {
      const c = child as HTMLElement
      if (window.getComputedStyle(c).position === 'absolute') {
        c.style.pointerEvents = 'none'
      }
    })
  })

  if (floatSpecs.length) {
    snapFloatOverlays(container, floatSpecs)
  }

  const totalPages = papers.length
  const paperList =
    ((window as any).hinnn?._paperList?.length
      ? (window as any).hinnn._paperList
      : allPages) || []
  paperList.slice(0, totalPages).forEach((page: any, pi: number) => {
    page.updatePaperNumber?.(pi + 1, totalPages)
  })

  // 溢出页/搬运后可能产生新 paper 或改动 DOM，再钉一次页尾
  pinPageFooters(container, footerSpecs, pinnedPaperNumberBottomGap)

  if ((window as any).hinnn) {
    ;(window as any).hinnn._paperList = []
  }

  container.querySelectorAll('.hiprint_rul_wrapper').forEach((el) => el.remove())

  return {
    pageCount: totalPages,
    dispose: () => {
      try {
        pt.clear?.()
      } catch {
        /* ignore */
      }
      container.innerHTML = ''
    },
  }
}

function getPaperSizePt(paper: HTMLElement): { w: number; h: number } {
  const hinnn = (window as any).hinnn
  const parse = (raw: string): number | null => {
    if (!raw) return null
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) return null
    if (raw.includes('mm') && hinnn?.mm?.toPt) return hinnn.mm.toPt(n)
    return n
  }

  const w = parse(paper.style.width)
  const h = parse(paper.style.height)
  if (w && h) return { w, h }

  return {
    w: hinnn?.mm?.toPt?.(210) ?? 595.28,
    h: hinnn?.mm?.toPt?.(297) ?? 841.89,
  }
}

function ptToMm(pt: number): number {
  return Math.round(((pt * 25.4) / 72) * 100) / 100
}

/** 只收集 hiprint / 打印相关样式，避免拷贝整站 ant-design */
function collectPrintStylesHtml(): string {
  const parts: string[] = []
  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    const href = (node as HTMLLinkElement).href || ''
    if (/hiprint|print-lock/i.test(href)) {
      parts.push(`<link rel="stylesheet" href="${href}">`)
    }
  })
  document.querySelectorAll('style').forEach((node) => {
    const text = node.textContent || ''
    if (/hiprint-print|\.hiprint-|print-lock/i.test(text)) {
      parts.push(`<style>${text}</style>`)
    }
  })
  return parts.join('\n')
}

/**
 * 在轻量 iframe 中打印：不给整站套 display:none（那会极慢），
 * 只把纸张节点移入 iframe 后 print，结束后移回。
 */
export function printPreviewPapers(container: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const papers = Array.from(
      container.querySelectorAll('.hiprint-printPaper'),
    ) as HTMLElement[]
    if (!papers.length) {
      reject(new Error('没有可打印的页面'))
      return
    }

    const { w, h } = getPaperSizePt(papers[0])
    const wMm = ptToMm(w)
    const hMm = ptToMm(h)

    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'print')
    // 给真实纸张尺寸，避免 0×0 导致分页异常；放屏外不影响界面
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${wMm}mm;height:${hMm}mm;border:0;opacity:0;pointer-events:none;`
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      reject(new Error('无法创建打印文档'))
      return
    }

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
${collectPrintStylesHtml()}
<style>
@page { size: ${wMm}mm ${hMm}mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.hiprint-printPaper {
  display: block !important;
  box-shadow: none !important;
  margin: 0 !important;
  overflow: hidden !important;
  background: #fff !important;
  page-break-after: always !important;
  break-after: page !important;
  page-break-inside: avoid !important;
}
.hiprint-printPaper:last-child {
  page-break-after: auto !important;
  break-after: auto !important;
}
</style></head><body></body></html>`)
    doc.close()

    const markers: Comment[] = []
    const prevStyles: { el: HTMLElement; boxShadow: string; margin: string }[] = []

    papers.forEach((paper, i) => {
      const marker = document.createComment(`print-slot-${i}`)
      paper.parentNode?.insertBefore(marker, paper)
      markers.push(marker)
      prevStyles.push({
        el: paper,
        boxShadow: paper.style.boxShadow,
        margin: paper.style.margin,
      })
      paper.style.boxShadow = 'none'
      paper.style.margin = '0'
      if (!paper.style.width) paper.style.width = `${w}pt`
      if (!paper.style.height) paper.style.height = `${h}pt`
      doc.body.appendChild(paper)
    })

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      papers.forEach((paper, i) => {
        const marker = markers[i]
        if (marker?.parentNode) {
          marker.parentNode.insertBefore(paper, marker)
          marker.remove()
        } else {
          container.appendChild(paper)
        }
      })
      prevStyles.forEach(({ el, boxShadow, margin }) => {
        el.style.boxShadow = boxShadow
        el.style.margin = margin
      })
      iframe.remove()
      win.removeEventListener('afterprint', onAfterPrint)
      window.removeEventListener('afterprint', onAfterPrint)
      resolve()
    }
    const onAfterPrint = () => cleanup()

    win.addEventListener('afterprint', onAfterPrint)
    window.addEventListener('afterprint', onAfterPrint)
    setTimeout(cleanup, 60_000)

    try {
      win.focus()
      win.print()
    } catch (e) {
      cleanup()
      reject(e)
    }
  })
}

/** 导出 PDF：同源 HTML + 系统「另存为 PDF」（快，跨环境略有差异） */
export async function exportPreviewPapersToPdf(container: HTMLElement): Promise<void> {
  await printPreviewPapers(container)
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })
}

/** 按页截图生成 PDF（跨环境更接近预览所见） */
export async function exportPreviewPapersToImagePdf(
  container: HTMLElement,
  filename = '打印.pdf',
): Promise<void> {
  const papers = Array.from(
    container.querySelectorAll('.hiprint-printPaper'),
  ) as HTMLElement[]
  if (!papers.length) {
    throw new Error('没有可导出的页面')
  }

  const { jsPDF } = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default

  const { w, h } = getPaperSizePt(papers[0])
  const orientation = w > h ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [w, h],
  })

  for (let i = 0; i < papers.length; i++) {
    await yieldToUi()

    const paper = papers[i]
    const prevShadow = paper.style.boxShadow
    paper.style.boxShadow = 'none'
    paper.style.background = '#ffffff'
    paper.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    await yieldToUi()

    try {
      const canvas = await html2canvas(paper, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 1500,
      })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      if (i > 0) pdf.addPage([w, h], orientation)
      pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h)
    } finally {
      paper.style.boxShadow = prevShadow
    }
  }

  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  pdf.save(name)
}
