import { ref, nextTick, type Ref } from 'vue'

declare global {
  interface Window {
    hiprint: any
    $: any
    jQuery: any
  }
}

export function useHiprint() {
  const hiprintTemplate = ref<any>(null)
  const isReady = ref(false)
  const activeElement = ref<any>(null)
  // 保存事件处理函数引用，用于 destroy 时清理
  let globalKeyDownHandler: ((e: KeyboardEvent) => void) | null = null
  let copyPasteKeyDownHandler: ((e: KeyboardEvent) => void) | null = null
  let docMouseUpHandler: ((e: MouseEvent) => void) | null = null
  let contextMenuHandler: ((e: MouseEvent) => void) | null = null

  function init(
    containerSelector: string,
    settingContainerSelector: string,
    providers: Array<{ addElementTypes: (context: any) => void }>,
    panelTemplate: any,
    optionItems?: any[],
    options?: {
      onDataChanged?: (type: string, data: any) => void
      onImageChooseClick?: (target: any) => void
    }
  ) {
    if (!window.hiprint) {
      console.error('hiprint not loaded')
      return
    }

    const { hiprint } = window

    try {
      hiprint.init({ providers })
    } catch (e) {
      console.error('hiprint.init 失败:', e)
      return
    }

    // 注册 rightOffset / bottomOffset 自定义选项（hiprint 原生仅内置 leftOffset / topOffset）
    try {
      const $ = window.$
      if ($) {
        function RightOffsetOptionItem(this: any) {
          this.name = 'rightOffset'
        }
        RightOffsetOptionItem.prototype.createTarget = function () {
          return (this.target = $(
            '<div class="hiprint-option-item hiprint-option-item-row">' +
            '<div class="hiprint-option-item-label">右偏移</div>' +
            '<div class="hiprint-option-item-field">' +
            '<input type="text" placeholder="偏移量pt" class="auto-submit">' +
            '</div></div>'
          ))
        }
        RightOffsetOptionItem.prototype.getValue = function () {
          const v = this.target.find('input').val()
          if (v != null && v !== '') return parseFloat(String(v))
        }
        RightOffsetOptionItem.prototype.setValue = function (v: any) {
          const val = v ?? (window as any).HIPRINT_CONFIG?.panel?.default?.rightOffset ?? 0
          this.target.find('input').val(val)
        }
        RightOffsetOptionItem.prototype.destroy = function () {
          this.target.remove()
        }

        function BottomOffsetOptionItem(this: any) {
          this.name = 'bottomOffset'
        }
        BottomOffsetOptionItem.prototype.createTarget = function () {
          return (this.target = $(
            '<div class="hiprint-option-item hiprint-option-item-row">' +
            '<div class="hiprint-option-item-label">下偏移</div>' +
            '<div class="hiprint-option-item-field">' +
            '<input type="text" placeholder="偏移量pt" class="auto-submit">' +
            '</div></div>'
          ))
        }
        BottomOffsetOptionItem.prototype.getValue = function () {
          const v = this.target.find('input').val()
          if (v != null && v !== '') return parseFloat(String(v))
        }
        BottomOffsetOptionItem.prototype.setValue = function (v: any) {
          const val = v ?? (window as any).HIPRINT_CONFIG?.panel?.default?.bottomOffset ?? 0
          this.target.find('input').val(val)
        }
        BottomOffsetOptionItem.prototype.destroy = function () {
          this.target.remove()
        }

        hiprint.setConfig({
          optionItems: [RightOffsetOptionItem as any, BottomOffsetOptionItem as any],
        })
      }
    } catch (e) {
      console.error('自定义偏移选项注册失败:', e)
    }

    // ── 拖拽死区：防止点击时鼠标抖动导致元素位置偏移 ──
    // hiprint 的 hidraggable 没有 click/drag 阈值，mousedown 后任何 mousemove 都会改变位置。
    // 在 $.fn.hidraggable 入口包裹 onDrag：双轴位移均 < 4px 时直接 return false 不应用；
    // 越过阈值后扣除阈值长度再传给原 onDrag，避免元素突然跳跃。
    // 注意：print element 自带 onDrag 实现（更新 options + 多选联动），不能用 defaults 兜底，
    // 必须在 .hidraggable() 入口处改写 opts.onDrag。
    try {
      const $ = (window as any).$
      if ($?.fn?.hidraggable && !$.fn.hidraggable.__deadZonePatched) {
        $.fn.hidraggable.__deadZonePatched = true
        const origHidraggable = $.fn.hidraggable
        const DRAG_THRESHOLD = 4

        function applyDeadZone(e: any): boolean {
          if (!e || !e.data || typeof e.data.startX !== 'number' || typeof e.data.startY !== 'number') {
            return false
          }
          const dx = e.pageX - e.data.startX
          const dy = e.pageY - e.data.startY
          // 一旦越过阈值就永久切换到 1:1 跟随模式：
          // 否则拖回起点附近时元素会卡在上一帧位置不动
          if (!e.data.__dzCrossed) {
            // 双轴都在死区内 -> 不移动
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
              return true
            }
            e.data.__dzCrossed = true
          }
          const data = $(e.data.target).data('hidraggable')
          const scale = data?.options?.getScale?.() || 1
          // 每个轴独立处理：越过阈值则扣除阈值长度（1:1 跟随），否则回到起点
          if (Math.abs(dx) >= DRAG_THRESHOLD) {
            e.data.left = e.data.startLeft + (dx - Math.sign(dx) * DRAG_THRESHOLD) / scale
          } else {
            e.data.left = e.data.startLeft
          }
          if (Math.abs(dy) >= DRAG_THRESHOLD) {
            e.data.top = e.data.startTop + (dy - Math.sign(dy) * DRAG_THRESHOLD) / scale
          } else {
            e.data.top = e.data.startTop
          }
          return false
        }

        function wrapOnDrag(origOnDrag: any) {
          if (!origOnDrag) return function () {}
          if (origOnDrag.__deadZoneWrapped) return origOnDrag
          const wrapped = function (this: any, e: any, leftPt: any, topPt: any) {
            if (applyDeadZone(e)) return false
            // 用修改后的 e.data.left/top 重新计算 leftPt/topPt，
            // 确保 updateSizeAndPositionOptions 与 CSS 应用的是同一份坐标
            const data = $(e.data.target).data('hidraggable')
            if (data?.options) {
              leftPt = $.fn.dragLengthCNum(e.data.left, data.options)
              topPt = $.fn.dragLengthCNum(e.data.top, data.options)
            }
            return origOnDrag.call(this, e, leftPt, topPt)
          }
          wrapped.__deadZoneWrapped = true
          return wrapped
        }

        // 1. 默认 onDrag（mouseRect、面板拖拽项等未自定义 onDrag 的实例）
        const origDefaultsOnDrag = $.fn.hidraggable.defaults.onDrag
        $.fn.hidraggable.defaults.onDrag = wrapOnDrag(origDefaultsOnDrag)

        // 2. .hidraggable() 入口拦截 opts.onDrag（print element 等自定义 onDrag 的实例）
        const newHidraggable = function (this: any, opts: any) {
          if (typeof opts === 'object' && opts !== null && typeof opts.onDrag === 'function') {
            opts.onDrag = wrapOnDrag(opts.onDrag)
          }
          return origHidraggable.apply(this, arguments)
        }
        // 保留静态属性（methods/defaults/parseOptions/isDragging）
        Object.keys(origHidraggable).forEach((k) => {
          (newHidraggable as any)[k] = (origHidraggable as any)[k]
        })
        $.fn.hidraggable = newHidraggable
      }
    } catch (e) {
      console.warn('拖拽死区补丁失败:', e)
    }

    try {
      hiprintTemplate.value = new hiprint.PrintTemplate({
        template: panelTemplate,
        settingContainer: settingContainerSelector,
        ...options,
        willOutOfBounds: true,  // 由 applyUpdateSizeAndPosClampPatch 等补丁钳位，不依赖原生检查
      })
    } catch (e) {
      console.error('PrintTemplate 创建失败:', e)
      return
    }

    try {
      hiprintTemplate.value.design(containerSelector, { grid: true })

      // ── 框选自动选中元素 ──
      // 通过 document mouseup 检测框选框（mouseRect），松手后选中框内元素。
      const $ = (window as any).$
      function onDocMouseUp(e: MouseEvent) {
        const ep = hiprintTemplate.value?.editingPanel
        if (!ep) return
        const mr = ep.mouseRect
        if (!mr || !mr.target || !$('.mouseRect').length) return
        // 延迟一帧等待 hiprint 内部状态更新完毕
        requestAnimationFrame(() => {
          // 先用原生方法筛选（受 draggable !== false 限制，可能漏掉表格）
          let els = ep.getElementInRect(mr) || []
          // 手动补充表格：原生 getElementInRect 可能因 draggable 过滤漏掉
          // 必须在移除 .mouseRect 之前调用 inRect，因为 inRect 依赖 DOM 位置
          ep.printElements.forEach(function (el: any) {
            if (el && el.designTarget && (el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table')) {
              try {
                if (el.inRect(mr) && els.indexOf(el) === -1) {
                  els.push(el)
                }
              } catch {}
            }
          })
          // 移除框选框（必须在 inRect 之后）
          $('.mouseRect').remove()
          if (!els || !els.length) return
          // 取消所有当前选中（普通元素）
          $(containerSelector).find('div[panelindex]').removeClass('selected').css({ display: 'none' })
          // 取消表格选中（.selected 显示 resize 按钮，.table-selected 显示蓝色边框）
          ep.printElements.forEach(function (el: any) {
            if (el && el.designTarget && el.printElementType?.type?.includes('table')) {
              el.designTarget.removeClass('selected table-selected')
              el.designTarget.find('.resizebtn').css({ display: 'none' })
            }
          })
          // 选中框内所有元素
          els.forEach(function (el: any) {
            if (el && el.designTarget) {
              const isTable = el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table'
              if (isTable) {
                el.designTarget.addClass('selected table-selected')
                el.designTarget.find('.resizebtn').css({ display: '' })
              } else {
                const rp = el.designTarget.children('div[panelindex]')
                if (rp && rp.length) {
                  rp.addClass('selected').css({ display: 'block' })
                }
              }
            }
          })
          // 存储以便后续拖拽框时能一起移动
          mr.mouseRectSelectedElement = els
          // 单元素选中时触发属性面板更新
          if (els.length === 1 && els[0].getPrintElementSelectEventKey) {
            (window as any).hinnn?.event?.trigger(
              els[0].getPrintElementSelectEventKey(),
              { printElement: els[0] }
            )
          }
          // 框选多元素时，将焦点设置到容器以接收键盘事件
          if (els.length > 1) {
            setTimeout(() => {
              const container = document.querySelector(containerSelector) as HTMLElement
              if (container) {
                container.focus()
              }
            }, 50)
          }
        })
      }
      docMouseUpHandler = onDocMouseUp
      document.addEventListener('mouseup', docMouseUpHandler, true)

      // ── 剪贴板数据（闭包变量，避免 textarea textContent/value 不一致问题） ──
      let clipboardData: any[] = []

      // ── 全局键盘事件处理：方向键移动多选元素 ──
      globalKeyDownHandler = function onGlobalKeyDown(e: KeyboardEvent) {
        const tpl = hiprintTemplate.value
        if (!tpl) return
        const ep = tpl.editingPanel
        if (!ep) return
        // 焦点在可编辑元素上时不处理
        const activeEl = document.activeElement as HTMLElement | null
        const isEditable = !!activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable
        )
        if (isEditable) return
        // 只处理方向键
        if (![37, 38, 39, 40].includes(e.keyCode)) return
        // 收集所有选中的元素（包括表格）
        const selectedEls: any[] = []
        ep.printElements.forEach(function (el: any) {
          try {
            const isTable = el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table'
            const isSelected = isTable
              ? el.designTarget?.hasClass?.('selected')
              : (function () {
                  const last = el.designTarget?.children?.()?.last?.()
                  return last && last.css('display') === 'block' && last.hasClass('selected')
                })()
            if (isSelected) selectedEls.push(el)
          } catch {}
        })
        // 单选元素由 hiprint 原生处理，多选元素由这里处理
        if (selectedEls.length <= 1) return
        const movingDistance = (window as any).HIPRINT_CONFIG?.movingDistance || 1
        let dx = 0, dy = 0
        switch (e.keyCode) {
          case 37: dx = -movingDistance; break  // 左
          case 38: dy = -movingDistance; break  // 上
          case 39: dx = movingDistance; break   // 右
          case 40: dy = movingDistance; break   // 下
        }
        // 批量移动所有选中元素
        selectedEls.forEach(function (el: any) {
          if (el.updatePositionByMultipleSelect) {
            el.updatePositionByMultipleSelect(dx, dy)
          }
        })
        e.preventDefault()
        e.stopPropagation()
        // 触发数据变更事件
        ;(window as any).hinnn?.event?.trigger('hiprintTemplateDataChanged_' + tpl.id, '键盘移动')
      }
      document.addEventListener('keydown', globalKeyDownHandler, true)

      // ── Ctrl+C / Ctrl+V 快捷键 ──
      copyPasteKeyDownHandler = function onCopyPasteKeyDown(e: KeyboardEvent) {
        const tpl = hiprintTemplate.value
        if (!tpl) return
        const ep = tpl.editingPanel
        if (!ep) return
        const $ = (window as any).$
        // 焦点在可编辑文本元素上时，不拦截 Ctrl+C / Ctrl+V，让浏览器执行默认文本操作
        const activeEl = document.activeElement as HTMLElement | null
        const isEditable = !!activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable
        )
        if (isEditable) return
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 67) {
          // Ctrl+C: 收集所有选中元素到闭包变量
          clipboardData = []
          const selected: any[] = []
          ep.printElements.forEach(function (el: any) {
            try {
              const isTable = el.printElementType?.type?.includes('table')
              const isSelected = isTable
                ? el.designTarget?.hasClass?.('selected')
                : (function () {
                    const last = el.designTarget?.children?.()?.last?.()
                    return last && last.css('display') === 'block' && last.hasClass('selected')
                  })()
              if (isSelected) selected.push(el)
            } catch {}
          })
          if (selected.length > 0) {
            // 深拷贝快照，避免后续修改影响粘贴结果
            clipboardData = selected.map(function (el: any) {
              return {
                id: el.id,
                templateId: el.templateId,
                options: JSON.parse(JSON.stringify(
                  el.options?.getPrintElementOptionEntity?.() || el.options
                )),
                printElementType: el.printElementType?.getPrintElementTypeEntity?.() || el.printElementType,
              }
            })
            // 同步到 #copyArea，供右键菜单粘贴使用
            let copyArea = $('#copyArea')
            if (!copyArea.length) {
              copyArea = $('<textarea id="copyArea" style="position:absolute;left:0;top:0;opacity:0"></textarea>')
              $('body').append(copyArea)
            }
            copyArea.val(JSON.stringify(clipboardData))
          }
          e.preventDefault()
          e.stopPropagation()
        }
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 86) {
          // Ctrl+V: 使用闭包变量，不依赖 #copyArea 的 text()
          if (clipboardData.length > 0) {
            e.preventDefault()
            e.stopPropagation()
            manualPaste(ep, tpl)
          }
        }
        // Delete 键删除
        if (e.keyCode === 46 && !(e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable]')) {
          e.preventDefault()
          deleteSelectedElements(ep, tpl)
        }
      }
      document.addEventListener('keydown', copyPasteKeyDownHandler, true)

      // 手动粘贴（Ctrl+V + 右键菜单调用）
      function manualPaste(ep: any, tpl: any) {
        // 优先使用闭包变量；右键菜单时从 #copyArea 降级读取
        let copyData: any[]
        if (clipboardData.length > 0) {
          copyData = clipboardData
        } else {
          const $ = (window as any).$
          const copyArea = $('#copyArea')
          if (!copyArea.length) return
          try {
            copyData = JSON.parse(copyArea.val() || copyArea.text() || '[]')
          } catch { return }
        }
        if (!Array.isArray(copyData) || !copyData.length) return
        try {
          // 计算粘贴基准点：优先取当前选中元素的右下角，否则用复制源包围盒左上角偏移
          let baseLeft = 0, baseTop = 0
          const selectedEls = ep.printElements?.filter(function (el: any) {
            try {
              const isTable = el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table'
              return isTable
                ? el.designTarget?.hasClass?.('selected')
                : (function () {
                    const last = el.designTarget?.children?.()?.last?.()
                    return last && last.css('display') === 'block' && last.hasClass('selected')
                  })()
            } catch { return false }
          }) || []
          if (selectedEls.length > 0) {
            // 取所有选中元素的包围盒右下角
            let maxRight = -Infinity, maxBottom = -Infinity
            selectedEls.forEach(function (el: any) {
              const l = el.options?.left ?? 0
              const t = el.options?.top ?? 0
              const w = el.options?.width ?? 0
              const h = el.options?.height ?? 0
              if (l + w > maxRight) maxRight = l + w
              if (t + h > maxBottom) maxBottom = t + h
            })
            baseLeft = maxRight
            baseTop = maxBottom
          } else {
            // 无选中：基于复制源包围盒左上角
            let minL = Infinity, minT = Infinity
            copyData.forEach(function (item: any) {
              const left = item.options?.left ?? 0
              const top = item.options?.top ?? 0
              if (left < minL) minL = left
              if (top < minT) minT = top
            })
            baseLeft = minL
            baseTop = minT
          }
          // 计算复制源包围盒左上角（用于保持相对位置）
          let minLeft = Infinity, minTop = Infinity
          copyData.forEach(function (item: any) {
            const left = item.options?.left ?? 0
            const top = item.options?.top ?? 0
            if (left < minLeft) minLeft = left
            if (top < minTop) minTop = top
          })
          // 粘贴偏移量：在基准点基础上偏移 20pt
          const offsetX = 20
          const offsetY = 20
          const pastedEls: any[] = []
          copyData.forEach(function (item: any) {
            const newOptions = JSON.parse(JSON.stringify(item.options))
            // 保持相对位置：新位置 = 原位置 - 复制源包围盒左上角 + 基准点 + 偏移量
            newOptions.left = (item.options?.left ?? 0) - minLeft + baseLeft + offsetX
            newOptions.top = (item.options?.top ?? 0) - minTop + baseTop + offsetY
            // 尝试通过 id 找到原元素进行克隆
            const srcEl = ep.getElementById?.(item.id)
            if (srcEl && typeof srcEl.clone === 'function') {
              const cloned = srcEl.clone({ options: newOptions, printElementType: item.printElementType })
              if (cloned) {
                // clone 内部是浅拷贝，需用快照深拷贝覆盖所有属性
                Object.keys(newOptions).forEach(function (k) {
                  try { cloned.options[k] = JSON.parse(JSON.stringify(newOptions[k])) }
                  catch { cloned.options[k] = newOptions[k] }
                })
                cloned.options.setLeft?.(newOptions.left)
                cloned.options.setTop?.(newOptions.top)
                cloned.setTemplateId?.(ep.templateId)
                cloned.setPanel?.(ep)
                ep.appendDesignPrintElement?.(ep.designPaper, cloned, false)
                ep.printElements?.push?.(cloned)
                cloned.design?.(void 0, ep.designPaper)
                pastedEls.push(cloned)
              }
            } else {
              // 降级：通过 PrintElementTypeManager 构建新元素
              const ptm = (window as any).hiprint?.PrintElementTypeManager
              if (ptm && item.printElementType?.tid) {
                const typeDef = ptm.getElementType?.(item.printElementType.tid)
                if (typeDef && typeof typeDef.buildByOption === 'function') {
                  const newEl = typeDef.buildByOption(newOptions)
                  if (newEl && ep.appendDesignPrintElement) {
                    newEl.setTemplateId?.(ep.templateId)
                    newEl.setPanel?.(ep)
                    ep.appendDesignPrintElement(ep.designPaper, newEl, false)
                    ep.printElements?.push?.(newEl)
                    newEl.design?.(void 0, ep.designPaper)
                    pastedEls.push(newEl)
                  }
                }
              }
            }
          })
          // 取消原有选中，选中新粘贴的元素
          deselectAll(ep)
          pastedEls.forEach(function (el: any) { selectElement(el) })
          ;(window as any).hinnn?.event?.trigger('hiprintTemplateDataChanged_' + tpl.id, '粘贴')
        } catch { /* ignore */ }
      }

      // 删除选中元素
      function deleteSelectedElements(ep: any, tpl: any) {
        const dels: any[] = []
        ep.printElements.forEach(function (el: any) {
          try {
            const isTable = el.printElementType?.type?.includes('table')
            const isSelected = isTable
              ? el.designTarget?.hasClass?.('selected')
              : (function () {
                  const last = el.designTarget?.children?.()?.last?.()
                  return last && last.css('display') === 'block' && last.hasClass('selected')
                })()
            if (isSelected) dels.push(el)
          } catch {}
        })
        if (dels.length) {
          dels.forEach(function (el: any) { el.delete?.() })
          ;(window as any).hinnn?.event?.trigger('hiprintTemplateDataChanged_' + tpl.id, '删除')
        }
      }

      // 取消所有元素的选中状态
      function deselectAll(ep: any) {
        const $ = (window as any).$
        ep.printElements.forEach(function (el: any) {
          try {
            const isTable = el.printElementType?.type?.includes('table')
            if (isTable) {
              el.designTarget?.removeClass?.('selected')
            } else {
              const panelDiv = el.designTarget?.children?.('div[panelindex]')
              if (panelDiv?.length) {
                panelDiv.removeClass('selected').css({ display: 'none' })
              }
            }
          } catch {}
        })
      }

      // 选中指定元素
      function selectElement(el: any) {
        const $ = (window as any).$
        try {
          const isTable = el.printElementType?.type?.includes('table')
          if (isTable) {
            el.designTarget?.addClass?.('selected')
          } else {
            const panelDiv = el.designTarget?.children?.('div[panelindex]')
            if (panelDiv?.length) {
              panelDiv.addClass('selected').css({ display: 'block' })
            }
          }
        } catch {}
      }

      // ── 右键上下文菜单 ──
      let ctxMenuEl: HTMLElement | null = null
      function hideCtxMenu() {
        if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null }
      }
      function onContextMenu(e: MouseEvent) {
        const tpl = hiprintTemplate.value
        if (!tpl) return
        const container = document.querySelector(containerSelector)
        if (!container || !container.contains(e.target as Node)) return
        const ep = tpl.editingPanel
        if (!ep) return
        // 表格元素不弹自定义右键菜单（保留原生列操作等菜单）
        if ((e.target as HTMLElement).closest?.('.hiprint-printElement-table')) return
        // 检查是否右键在表格的交互区域（列头 / grips 等），这些区域需要保留原生菜单
        const target = e.target as HTMLElement
        const isTableInteractive = !!(
          target.closest?.('thead') ||
          target.closest?.('.columngrip') ||
          target.closest?.('.rowgrip') ||
          target.closest?.('.gripResizer') ||
          target.closest?.('.hitable-context-menu')
        )
        // 收集选中元素
        const selectedEls: any[] = []
        ep.printElements.forEach(function (el: any) {
          try {
            const isTable = el.printElementType?.type?.includes('table')
            const isSelected = isTable
              ? el.designTarget?.hasClass?.('selected')
              : (function () {
                  const last = el.designTarget?.children?.()?.last?.()
                  return last && last.css('display') === 'block' && last.hasClass('selected')
                })()
            if (isSelected) selectedEls.push(el)
          } catch {}
        })
        hideCtxMenu()
        if (!selectedEls.length) return
        // 阻止浏览器默认右键菜单
        e.preventDefault()
        // 表格交互区域不阻止冒泡，让原生表格列菜单也能弹出
        if (!isTableInteractive) {
          e.stopPropagation()
        }
        // 创建自定义右键菜单
        const menu = document.createElement('div')
        menu.className = 'hiprint-ctx-menu'
        menu.style.cssText = 'position:fixed;z-index:99999;background:#fff;border:1px solid #d9d9d9;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15);padding:4px 0;min-width:120px;font-size:13px'
        menu.style.left = e.clientX + 'px'
        menu.style.top = e.clientY + 'px'
        function addMenuItem(text: string, color: string, bgHover: string, onClick: () => void) {
          const item = document.createElement('div')
          item.textContent = text
          item.style.cssText = 'padding:6px 12px;cursor:pointer;white-space:nowrap;color:' + color
          item.onmouseenter = () => { item.style.background = bgHover }
          item.onmouseleave = () => { item.style.background = '' }
          item.onclick = () => { hideCtxMenu(); onClick() }
          return item
        }
        menu.appendChild(addMenuItem('复制 (Ctrl+C)', '#333', '#f5f5f5', () => {
          const $ = (window as any).$
          let copyArea = $('#copyArea')
          if (!copyArea.length) {
            copyArea = $('<textarea id="copyArea" style="position:absolute;left:0;top:0;opacity:0"></textarea>')
            $('body').append(copyArea)
          }
          const copyData = selectedEls.map(function (el: any) {
            return {
              id: el.id,
              templateId: el.templateId,
              options: el.options?.getPrintElementOptionEntity?.() || el.options,
              printElementType: el.printElementType?.getPrintElementTypeEntity?.() || el.printElementType,
            }
          })
          copyArea.text(JSON.stringify(copyData))
        }))
        menu.appendChild(addMenuItem('粘贴 (Ctrl+V)', '#333', '#f5f5f5', () => {
          manualPaste(ep, tpl)
        }))
        // 分隔线
        const sep = document.createElement('div')
        sep.style.cssText = 'border-top:1px solid #f0f0f0;margin:4px 0'
        menu.appendChild(sep)
        menu.appendChild(addMenuItem('删除 (Delete)', '#ff4d4f', '#fff1f0', () => {
          selectedEls.forEach(function (el: any) { el.delete?.() })
          ;(window as any).hinnn?.event?.trigger('hiprintTemplateDataChanged_' + tpl.id, '删除')
        }))
        document.body.appendChild(menu)
        ctxMenuEl = menu
        // 点击其他地方关闭菜单
        const closeHandler = function (ev: Event) {
          if (menu && !menu.contains(ev.target as Node)) {
            hideCtxMenu()
            document.removeEventListener('mousedown', closeHandler, true)
          }
        }
        setTimeout(() => document.addEventListener('mousedown', closeHandler, true), 0)
      }
      contextMenuHandler = onContextMenu
      document.addEventListener('contextmenu', contextMenuHandler, true)

      // ── 表格点击选中 + 全元素取消选中（捕获阶段） ──
      // 表格使用 hireizeable 的 noContainer 模式，无法通过冒泡委托检测选中
      // （bindTrigger 的 stopPropagation 阻止事件到达父元素）。
      // 使用原生捕获阶段监听器确保在 stopPropagation 之前触发。
      // 同时跟踪拖拽位移，防止拖拽后 click 触发 triggerResize 清空多选。
      try {
        const paperEl = document.querySelector(containerSelector)
        if (paperEl) {
          let dragStartPos: { x: number; y: number } | null = null
          let wasDragging = false
          // 全局 mousedown：记录起始坐标
          document.addEventListener('mousedown', function (e: MouseEvent) {
            dragStartPos = { x: e.clientX, y: e.clientY }
            wasDragging = false
          }, true)
          // 全局 mousemove：位移 > 3px 视为拖拽
          document.addEventListener('mousemove', function (e: MouseEvent) {
            if (dragStartPos && !wasDragging) {
              if (Math.abs(e.clientX - dragStartPos.x) > 3 || Math.abs(e.clientY - dragStartPos.y) > 3) {
                wasDragging = true
              }
            }
          }, true)
          paperEl.addEventListener('click', function (e: Event) {
            const target = e.target as HTMLElement
            // 拖拽后 → 阻断 click 冒泡，防止 bindTrigger → triggerResize 清空多选
            if (wasDragging && target.closest('.hiprint-printElement')) {
              wasDragging = false
              dragStartPos = null
              e.stopPropagation()
              return
            }
            wasDragging = false
            dragStartPos = null
            const tableEl = target.closest('.hiprint-printElement-table') as HTMLElement
            if (tableEl) {
              const $pt = (window as any).$
              if ($pt) {
                $pt('.hiprint-printElement-table.selected').not(tableEl).removeClass('selected')
                  .find('.resizebtn').css({ display: 'none' })
              }
              tableEl.classList.add('selected')
              const btns = tableEl.querySelectorAll('.resizebtn')
              btns.forEach((b: any) => { b.style.display = '' })
            }
          }, true)
          paperEl.addEventListener('mousedown', function (e: Event) {
            const me = e as MouseEvent
            // Ctrl/Cmd 点击交由 hiprint 处理多选
            if (me.ctrlKey || me.metaKey) return
            const target = e.target as HTMLElement
            const $pt = (window as any).$
            if (!$pt) return

            const elementEl = target.closest('.hiprint-printElement') as HTMLElement | null
            if (!elementEl) {
              // 点击空白区域：取消所有选中
              $pt(containerSelector).find('div[panelindex]').removeClass('selected').css({ display: 'none' })
              $pt('.hiprint-printElement-table.selected').removeClass('selected')
                .find('.resizebtn').css({ display: 'none' })
              return
            }

            // 点击元素：检查是否已选中
            const isTable = !!target.closest('.hiprint-printElement-table')
            const rp = $pt(elementEl).children('div[panelindex]')
            const isSelected = isTable
              ? $pt(elementEl).hasClass('selected')
              : (rp.length && rp.hasClass('selected'))

            // 已选中 -> 保持多选状态（用于多选拖动），交由 hiprint 处理
            if (isSelected) return

            // 未选中 -> 在拖拽开始前先取消其他选中，只选中当前元素
            // 否则 hiprint 的 onDrag 会把已选中元素一起移动（isMultiple 分支）
            $pt(containerSelector).find('div[panelindex]').removeClass('selected').css({ display: 'none' })
            $pt('.hiprint-printElement-table.selected').removeClass('selected')
              .find('.resizebtn').css({ display: 'none' })
            if (isTable) {
              $pt(elementEl).addClass('selected')
              $pt(elementEl).find('.resizebtn').css({ display: '' })
            } else if (rp.length) {
              rp.addClass('selected').css({ display: 'block' })
            }

            // 触发选中事件，更新属性面板
            const ep = hiprintTemplate.value?.editingPanel
            if (ep) {
              const el = ep.printElements.find((pe: any) => {
                const dt = pe.designTarget
                return dt && (dt[0] === elementEl || dt === elementEl)
              })
              if (el && el.getPrintElementSelectEventKey) {
                ;(window as any).hinnn?.event?.trigger(
                  el.getPrintElementSelectEventKey(),
                  { printElement: el }
                )
              }
            }
          }, true)
        }
      } catch (e) {
        console.warn('表格点击选中补丁失败:', e)
      }

      // ── fixed → draggable + resize 联动 ──
      // hiprint 仅在编辑 blur 时更新 draggable（且默认重置为 true），
      // fixed 变更时不同步 hidraggable 状态，导致位置锁定不生效。
      // 通过原型链找到 updateOption 所在原型并 patch。
      function applyFixedPatch(): boolean {
        const $ = (window as any).$
        if (!$) return false
        const el = hiprintTemplate.value?.editingPanel?.printElements?.[0]
        if (!el) return false
        let proto: any = Object.getPrototypeOf(el)
        while (proto && !Object.prototype.hasOwnProperty.call(proto, 'updateOption')) {
          proto = Object.getPrototypeOf(proto)
        }
        if (proto && !proto.__fixedPatchApplied) {
          proto.__fixedPatchApplied = true
          const origUpdateOption = proto.updateOption
          proto.updateOption = function (this: any, o: string, v: any, b?: boolean) {
            origUpdateOption.call(this, o, v, b)
            if (o === 'fixed') {
              this.options.draggable = !v
              if (this.designTarget) {
                const $dt = $(this.designTarget)
                $dt.hidraggable('update', { draggable: !v })
                // data-fixed 属性用于 CSS 隐藏 resize 控制点
                $dt.attr('data-fixed', v ? 'true' : 'false')
                const rp = $dt.find('.resize-panel')[0]
                if (rp) {
                  rp.setAttribute('data-fixed', v ? 'true' : 'false')
                }
              }
            }
          }
          // ── setResizePanel patch ──
          // 元素创建/刷新时，setResizePanel 会重建 resize handles，
          // 需要在此时重新应用 coordinateSync 锁定状态
          const origSetResizePanel = proto.setResizePanel
          proto.setResizePanel = function (this: any) {
            origSetResizePanel.call(this)
            if (this.designTarget) {
              // 位置锁定：coordinateSync 为 true 时禁止拖拽
              if (this.options.coordinateSync && this.options.draggable !== false) {
                this.options.draggable = false
                $(this.designTarget).hidraggable('update', { draggable: false })
              }
            }
          }

          // submitOption 直接设置 options[e.name] = n，不经过 updateOption，
          // 因此在 submitOption 完成后也需同步 fixed → draggable
          const origSubmitOption = proto.submitOption
          proto.submitOption = function (this: any) {
            const wasFixed = this.options.fixed
            // 收集 pristine color 对应的选项名（背景色/边框色默认 #000000 需拦截）
            const container = document.getElementById('PrintElementOptionSetting')
            const pristineOpts: string[] = []
            if (container) {
              container.querySelectorAll<HTMLElement>(
                '.hiprint-option-item[data-option-name]'
              ).forEach((item) => {
                const ci = item.querySelector('input[type="color"][data-color-pristine]')
                if (ci) pristineOpts.push(item.getAttribute('data-option-name')!)
              })
            }
            origSubmitOption.call(this)
            // 清除被误设为 #000000 的pristine颜色值，并重绘
            let needsRedraw = false
            pristineOpts.forEach((name) => {
              if (this.options[name] === '#000000' || this.options[name] === 'rgb(0,0,0)') {
                this.options[name] = undefined
                needsRedraw = true
              }
            })
            if (needsRedraw) {
              this.updateDesignViewFromOptions()
            }
            // ── fixed / coordinateSync 控制拖拽锁定 ──
            const shouldDrag = !this.options.fixed && !this.options.coordinateSync
            this.options.draggable = shouldDrag
            if (this.designTarget) {
              const $dt = $(this.designTarget)
              $dt.hidraggable('update', { draggable: shouldDrag })
              $dt.attr('data-fixed', this.options.fixed ? 'true' : 'false')
              const rp = $dt.find('.resize-panel')[0]
              if (rp) {
                rp.setAttribute('data-fixed', this.options.fixed ? 'true' : 'false')
              }
            }

          }
        }
        return true
      }

      // ── Resize 边界钳位 ──
      // hiprint 的 bindResizeEvent 在 mousemove 时直接设置 CSS width/height，
      // 然后才调用 onResize → updateSizeAndPositionOptions 做边界检查。
      // 边界检查返回 early 时选项未更新，但 CSS 已越界。
      // 需要在 onResize 中钳位并修正 CSS。
      function applyResizeClampPatch(): boolean {
        const el = hiprintTemplate.value?.editingPanel?.printElements?.[0]
        if (!el) return false

        // Patch BasePrintElement.prototype.onResize（文本/图片/长文/条形码/二维码等均通过父级调用）
        let baseProto: any = Object.getPrototypeOf(el)
        while (baseProto && !Object.prototype.hasOwnProperty.call(baseProto, 'updateOption')) {
          baseProto = Object.getPrototypeOf(baseProto)
        }
        if (baseProto && !baseProto.__resizeClampApplied) {
          baseProto.__resizeClampApplied = true
          const origOnResize = baseProto.onResize
          baseProto.onResize = function (this: any, event: any, height: any, width: any, top: any, left: any) {
            const clamped = clampResizeValues(this, height, width, top, left)
            return origOnResize.call(this, event, clamped.height, clamped.width, clamped.top, clamped.left)
          }
        }

        // Patch 所有已存在元素的子类 onResize（表格等直接调用 updateSizeAndPositionOptions 的类型）
        const allEls = hiprintTemplate.value.editingPanel.printElements
        for (const e of allEls) {
          patchSubclassOnResize(e)
        }

        return true
      }

      function patchSubclassOnResize(el: any) {
        const proto = Object.getPrototypeOf(el)
        if (proto && Object.prototype.hasOwnProperty.call(proto, 'onResize') && !proto.__resizeClampApplied) {
          proto.__resizeClampApplied = true
          const orig = proto.onResize
          proto.onResize = function (this: any, event: any, height: any, width: any, top: any, left: any) {
            const clamped = clampResizeValues(this, height, width, top, left)
            return orig.call(this, event, clamped.height, clamped.width, clamped.top, clamped.left)
          }
        }
        // 为表格安装 style 属性 MutationObserver 边界守卫
        installTableStyleGuard(el)
      }

      // ── 表格 style 属性边界守卫 ──
      // hireizeable 在 noContainer 模式下每次 mousemove 都先用 u.css() 改 CSS，
      // 然后才调 onResize。MutationObserver 在每次 style 变更后立即钳位，
      // 确保表格拖拽拉伸时永远不会超出画布边界。
      const tableStyleGuards = new Map<any, MutationObserver>()

      function installTableStyleGuard(el: any, _retryCount?: number) {
        const retryCount = _retryCount || 0
        if (!el) return
        // design() 可能尚未调用，designTarget 尚未创建，用 RAF 重试（最多 50 帧 ≈ 0.8s）
        if (!el.designTarget) {
          if (retryCount < 50) {
            requestAnimationFrame(() => installTableStyleGuard(el, retryCount + 1))
          }
          return
        }
        const isTable = el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table'
        if (!isTable) return
        const dt = el.designTarget[0] || el.designTarget
        if (!dt || tableStyleGuards.has(el)) return

        let clamping = false
        // 用当前 CSS 值初始化，避免首次 NaN 比较导致 isDrag 误判
        // jQuery .css() 返回 px，统一转为 pt 与边界值（pt）对齐
        let prevLeft: number, prevTop: number, prevW: number, prevH: number
        try {
          const $ = (window as any).$
          const h = (window as any).hinnn
          if (h?.px?.toPt) {
            prevLeft = h.px.toPt(parseFloat($(dt).css('left')) || 0)
            prevTop = h.px.toPt(parseFloat($(dt).css('top')) || 0)
            prevW = h.px.toPt(parseFloat($(dt).css('width')) || 0)
            prevH = h.px.toPt(parseFloat($(dt).css('height')) || 0)
          } else {
            prevLeft = 0; prevTop = 0; prevW = 0; prevH = 0
          }
        } catch {
          prevLeft = 0; prevTop = 0; prevW = 0; prevH = 0
        }
        const observer = new MutationObserver(() => {
          if (clamping) return
          clamping = true
          const $ = (window as any).$
          const panel = el.panel || (hiprintTemplate.value as any)?.editingPanel
          const hinnn = (window as any).hinnn
          if (!hinnn || !panel || !$) { clamping = false; return }

          const pw = hinnn.mm.toPt(panel.width)
          const ph = hinnn.mm.toPt(panel.height)
          const lo = Number(panel.leftOffset ?? 0)
          const to = Number(panel.topOffset ?? 0)
          const ro = Number(panel.rightOffset ?? 0)
          const bo = Number(panel.bottomOffset ?? 0)

          // jQuery .css() 返回 px，转为 pt 与边界值（hinnn.mm.toPt）对齐
          const rawLeftPx = parseFloat($(dt).css('left')) || 0
          const rawTopPx = parseFloat($(dt).css('top')) || 0
          const rawWPx = parseFloat($(dt).css('width')) || 0
          const rawHPx = parseFloat($(dt).css('height')) || 0
          const rawLeft = hinnn.px.toPt(rawLeftPx)
          const rawTop = hinnn.px.toPt(rawTopPx)
          const rawW = hinnn.px.toPt(rawWPx)
          const rawH = hinnn.px.toPt(rawHPx)

          // 区分拖拽移动（仅 left/top 变）与拉抻（width/height 变）
          const leftChanged = rawLeft !== prevLeft
          const topChanged = rawTop !== prevTop
          const widthChanged = rawW !== prevW
          const heightChanged = rawH !== prevH
          const isDrag = (leftChanged || topChanged) && !widthChanged && !heightChanged

          if (isDrag) {
            // 拖拽移动：完全交给 hi draggable 自身限位（基于 clientWidth 像素计算）
            // + applyUpdateSizeAndPosClampPatch 处理，Observer 不干预 CSS
            // 否则会与 hi draggable 内部 position 计算产生竞态，导致宽度被意外修改
          } else {
            // 拉抻或初始化：钳位尺寸 + 同步修正 options 值（否则预览时用越界值）
            if (rawLeft < lo) {
              $(dt).css('left', lo + 'pt')
              el.options.setLeft?.(lo)
            }
            if (rawTop < to) {
              $(dt).css('top', to + 'pt')
              el.options.setTop?.(to)
            }
            if (rawLeft + rawW > pw - ro) {
              const clampedW = Math.max(1, pw - ro - rawLeft)
              $(dt).css('width', clampedW + 'pt')
              el.options.width = clampedW
            }
            if (rawTop + rawH > ph - bo) {
              const clampedH = Math.max(1, ph - bo - rawTop)
              $(dt).css('height', clampedH + 'pt')
              el.options.height = clampedH
            }
          }

          prevLeft = rawLeft; prevTop = rawTop; prevW = rawW; prevH = rawH
          clamping = false
        })
        observer.observe(dt, { attributes: true, attributeFilter: ['style'] })
        tableStyleGuards.set(el, observer)
      }

      function clampResizeValues(el: any, height: any, width: any, top: any, left: any) {
        const panel = el.panel || (hiprintTemplate.value as any)?.editingPanel
        const hinnn = (window as any).hinnn
        if (!hinnn || !panel) return { height, width, top, left }

        const panelWidthPt = hinnn.mm.toPt(panel.width)
        const panelHeightPt = hinnn.mm.toPt(panel.height)
        const lo = Number(panel.leftOffset ?? 0)
        const to = Number(panel.topOffset ?? 0)
        const ro = Number(panel.rightOffset ?? 0)
        const bo = Number(panel.bottomOffset ?? 0)

        let curLeft = left != null ? left : el.options.getLeft()
        let curTop = top != null ? top : el.options.getTop()
        let curWidth = width != null ? width : el.options.width
        let curHeight = height != null ? height : el.options.height

        if (curLeft < lo) { curLeft = lo; left = lo }
        if (curTop < to) { curTop = to; top = to }
        if (curLeft + curWidth > panelWidthPt - ro) {
          curWidth = Math.max(1, panelWidthPt - ro - curLeft)
          width = curWidth
        }
        if (curTop + curHeight > panelHeightPt - bo) {
          curHeight = Math.max(1, panelHeightPt - bo - curTop)
          height = curHeight
        }

        // 修正已越界的 CSS（立即）
        const $ = (window as any).$
        if ($ && el.designTarget) {
          if (left != null) $(el.designTarget).css('left', left + 'pt')
          if (top != null) $(el.designTarget).css('top', top + 'pt')
          if (width != null) $(el.designTarget).css('width', width + 'pt')
          if (height != null) $(el.designTarget).css('height', height + 'pt')
          // 表格 noContainer 模式下 hireizeable 可能在 onResize 回调后再次修改 CSS，
          // 用 RAF 做二次校验确保边界不会被突破
          const isTable = el.printElementType?.type?.includes('table') || el.printElementType?.type === 'table'
          if (isTable) {
            const dt = el.designTarget
            requestAnimationFrame(() => {
              const h = (window as any).hinnn
              // jQuery .css() 返回 px，转为 pt 与 panelWidthPt 对齐
              const rawLeftPx = parseFloat($(dt).css('left')) || 0
              const rawTopPx = parseFloat($(dt).css('top')) || 0
              const rawWPx = parseFloat($(dt).css('width')) || 0
              const rawHPx = parseFloat($(dt).css('height')) || 0
              const rawLeft = h ? h.px.toPt(rawLeftPx) : rawLeftPx
              const rawTop = h ? h.px.toPt(rawTopPx) : rawTopPx
              const rawW = h ? h.px.toPt(rawWPx) : rawWPx
              const rawH = h ? h.px.toPt(rawHPx) : rawHPx
              let fixed = false
              if (rawLeft < lo) {
                $(dt).css('left', lo + 'pt')
                el.options.setLeft?.(lo)
                fixed = true
              }
              if (rawTop < to) {
                $(dt).css('top', to + 'pt')
                el.options.setTop?.(to)
                fixed = true
              }
              if (rawLeft + rawW > panelWidthPt - ro) {
                const clampedW = Math.max(1, panelWidthPt - ro - rawLeft)
                $(dt).css('width', clampedW + 'pt')
                el.options.width = clampedW
                fixed = true
              }
              if (rawTop + rawH > panelHeightPt - bo) {
                const clampedH = Math.max(1, panelHeightPt - bo - rawTop)
                $(dt).css('height', clampedH + 'pt')
                el.options.height = clampedH
                fixed = true
              }
              if (fixed) {
                el.updateSizeAndPositionOptions?.(
                  parseFloat($(dt).css('left')) || rawLeft,
                  parseFloat($(dt).css('top')) || rawTop,
                  parseFloat($(dt).css('width')) || rawW,
                  parseFloat($(dt).css('height')) || rawH
                )
              }
            })
          }
        }

        return { height, width, top, left }
      }

      // ── updateSizeAndPositionOptions 钳位补丁 ──
      // 原生实现在越界时直接 return，导致内部选项与 CSS 位置不同步。
      // 表格的 hidraggable 没有 containment，导致拖拽/预览时位置跑到画布外。
      // 此补丁在调用原生方法前钳位 left/top，确保永远不会越界。
      function applyUpdateSizeAndPosClampPatch(): boolean {
        const el = hiprintTemplate.value?.editingPanel?.printElements?.[0]
        if (!el) return false
        let baseProto: any = Object.getPrototypeOf(el)
        while (baseProto && !Object.prototype.hasOwnProperty.call(baseProto, 'updateOption')) {
          baseProto = Object.getPrototypeOf(baseProto)
        }
        if (baseProto && !baseProto.__updateSizePosClamped) {
          baseProto.__updateSizePosClamped = true
          const orig = baseProto.updateSizeAndPositionOptions
          baseProto.updateSizeAndPositionOptions = function (this: any, t: any, e: any, n: any, i: any) {
            const panel = this.panel
            const hinnn = (window as any).hinnn
            if (panel && hinnn) {
              const pw = hinnn.mm.toPt(panel.width)
              const ph = hinnn.mm.toPt(panel.height)
              const lo = Number(panel.leftOffset ?? 0)
              const to = Number(panel.topOffset ?? 0)
              const ro = Number(panel.rightOffset ?? 0)
              const bo = Number(panel.bottomOffset ?? 0)
              if (t != null && t < lo) t = lo
              if (e != null && e < to) e = to
              // resize 时钳位宽/高
              if (t != null && n != null && t + (n || this.options.width) > pw - ro) {
                n = Math.max(1, pw - ro - t)
              }
              if (e != null && i != null && e + (i || this.options.height) > ph - bo) {
                i = Math.max(1, ph - bo - e)
              }
            }
            return orig.call(this, t, e, n, i)
          }
        }
        return true
      }

      // ── delete 同步补丁 ──
      // 原生 BasePrintElement.prototype.delete 只移除 DOM，不从 panel.printElements 中剔除，
      // 导致 getJson() / 预览仍包含已删除元素。补丁在删除 DOM 后同步 splice 数组。
      function applyDeleteSyncPatch(): boolean {
        const el = hiprintTemplate.value?.editingPanel?.printElements?.[0]
        if (!el) return false
        let baseProto: any = Object.getPrototypeOf(el)
        while (baseProto && !Object.prototype.hasOwnProperty.call(baseProto, 'delete')) {
          baseProto = Object.getPrototypeOf(baseProto)
        }
        if (baseProto && !baseProto.__deleteSyncPatched) {
          baseProto.__deleteSyncPatched = true
          const origDelete = baseProto.delete
          baseProto.delete = function (this: any) {
            const panel = this.panel
            try {
              if (panel && Array.isArray(panel.printElements)) {
                const idx = panel.printElements.indexOf(this)
                if (idx > -1) panel.printElements.splice(idx, 1)
              }
            } catch { /* ignore */ }
            return origDelete.call(this)
          }
        }
        return true
      }

      try {
        const fixedOk = applyFixedPatch()
        const clampOk = applyResizeClampPatch()
        applyUpdateSizeAndPosClampPatch()
        applyDeleteSyncPatch()
        if (!fixedOk || !clampOk) {
          const paper = document.querySelector('.hiprint-printPaper-content')
          if (paper) {
            const mo = new MutationObserver((mutations) => {
              applyFixedPatch()
              applyResizeClampPatch()
              applyUpdateSizeAndPosClampPatch()
              applyDeleteSyncPatch()
              // 对新添加的元素做子类 onResize patch
              // 关键：DOM 先于 printElements.push 插入，须延迟到 printElements 更新后
              let hasNewEl = false
              for (const m of mutations) {
                for (const node of m.addedNodes) {
                  if (node instanceof HTMLElement && (
                    node.classList?.contains('hiprint-printElement') ||
                    node.querySelector?.('.hiprint-printElement')
                  )) {
                    hasNewEl = true
                    break
                  }
                }
                if (hasNewEl) break
              }
              if (hasNewEl) {
                // 延迟到 printElements.push 之后
                setTimeout(() => {
                  const allEls = hiprintTemplate.value?.editingPanel?.printElements || []
                  for (const e of allEls) {
                    patchSubclassOnResize(e)
                  }
                }, 0)
              }
            })
            mo.observe(paper, { childList: true, subtree: true })
          }
        }
      } catch (e) {
        console.error('patch 失败:', e)
      }

      isReady.value = true

      // 清除 .hiprint-printPaper-content 上 hiprint 自动注入的 CSS left/top，
      // 统一由 hidraggable 在元素层面处理四个方向的偏移钳位
      // 用 MutationObserver 永久监听，防止 updateDesignViewFromOptions 重绘时重新设置
      document.querySelectorAll('.hiprint-printPaper-content').forEach((el: any) => {
        el.style.left = ''
        el.style.top = ''
        const mo = new MutationObserver(() => {
          if (el.style.left || el.style.top) {
            el.style.left = ''
            el.style.top = ''
          }
        })
        mo.observe(el, { attributes: true, attributeFilter: ['style'] })
      })

      // ── 初始化 & 保存 rightOffset / bottomOffset ──
      const template = hiprintTemplate.value as any
      if (template && template.printPanels) {
        const $ = window.$

        template.printPanels.forEach((panel: any) => {
          const defaults = (window as any).HIPRINT_CONFIG?.panel?.default
          panel.leftOffset = panel.leftOffset ?? defaults?.leftOffset ?? 20
          panel.topOffset = panel.topOffset ?? defaults?.topOffset ?? 20
          panel.rightOffset = panel.rightOffset ?? defaults?.rightOffset ?? 0
          panel.bottomOffset = panel.bottomOffset ?? defaults?.bottomOffset ?? 0

          if (!panel.__entityPatched) {
            panel.__entityPatched = true
            const orig = panel.getPanelEntity.bind(panel)
            panel.getPanelEntity = function (m: any) {
              const e = orig(m)
              e.rightOffset = panel.rightOffset
              e.bottomOffset = panel.bottomOffset
              return e
            }
          }

          if (panel.target && !panel.__clickIntercepted) {
            panel.__clickIntercepted = true
            $(panel.target).on('click.hiprint-patch', () => {
              ;(window as any).__activePanel = panel
            })
          }
        })

        // submit 保存 rightOffset / bottomOffset
        const hinnn = (window as any).hinnn
        if (hinnn?.event && !(template as any).__evtPatched) {
          ;(template as any).__evtPatched = true
          hinnn.event.on('BuildCustomOptionSettingEventKey_' + template.id, (eventData: any) => {
            const cb = eventData.callback
            eventData.callback = function (values: any) {
              // 检测纸张方向变化：orient 从 1(纵向) 变为 2(横向) 或反之时，交换画布宽高
              const p = (window as any).__activePanel
              if (p && values.orient != null && values.orient !== p.orient) {
                const oldOrient = p.orient || 1
                const newOrient = values.orient
                // 只有纵向↔横向切换时才旋转
                if ((oldOrient === 1 && newOrient === 2) || (oldOrient === 2 && newOrient === 1)) {
                  // 先更新 orient，再调用 rotatePaper 交换宽高
                  p.orient = newOrient
                  hiprintTemplate.value?.rotatePaper()
                }
              }
              cb(values)
              if (p) {
                if (values.rightOffset != null) p.rightOffset = values.rightOffset
                if (values.bottomOffset != null) p.bottomOffset = values.bottomOffset
              }
            }
          })

          hinnn.event.on('PrintElementSelectEventKey_' + template.id, (e: any) => {
            activeElement.value = e.printElement
          })

          // 拖拽 / 键盘移动 / 缩放 / 旋转后，属性面板输入框仍是旧值，
          // 需要重新触发选中事件以重建面板、刷新坐标显示。
          hinnn.event.on('hiprintTemplateDataChanged_' + template.id, (type: string) => {
            if (
              type === '移动' || type === '键盘移动' ||
              type === '大小' || type === '框选移动' || type === '旋转'
            ) {
              const el = activeElement.value
              if (el && el.getPrintElementSelectEventKey) {
                requestAnimationFrame(() => {
                  hinnn.event.trigger(
                    el.getPrintElementSelectEventKey(),
                    { printElement: el }
                  )
                })
              }
            }
          })
        }
      }
    } catch (e) {
      console.error('design 调用失败:', e)
    }
  }

  function destroy() {
    // 清理全局事件监听器
    if (globalKeyDownHandler) {
      document.removeEventListener('keydown', globalKeyDownHandler, true)
      globalKeyDownHandler = null
    }
    if (copyPasteKeyDownHandler) {
      document.removeEventListener('keydown', copyPasteKeyDownHandler, true)
      copyPasteKeyDownHandler = null
    }
    if (docMouseUpHandler) {
      document.removeEventListener('mouseup', docMouseUpHandler, true)
      docMouseUpHandler = null
    }
    if (contextMenuHandler) {
      document.removeEventListener('contextmenu', contextMenuHandler, true)
      contextMenuHandler = null
    }
    if (hiprintTemplate.value) {
      hiprintTemplate.value.destroy()
      hiprintTemplate.value = null
    }
    isReady.value = false
  }

  function print() {
    hiprintTemplate.value?.print()
  }

  function toPdf(): Promise<Blob> {
    return hiprintTemplate.value?.toPdf?.() || Promise.reject('not available')
  }

  function setPaper(type: string, width: number, height: number) {
    hiprintTemplate.value?.setPaper(type, { width, height })
  }

  function rotatePaper() {
    hiprintTemplate.value?.rotatePaper()
  }

  function setZoom(scale: number) {
    hiprintTemplate.value?.zoom?.(scale)
    // 缩放时动态调整网格线大小，确保在任何缩放级别下网格线都可见
    // 当 scale 小于 1 时，网格线背景尺寸需要放大，保证屏幕上至少 1px
    const gridSize = Math.max(5, 5 / scale)
    document.documentElement.style.setProperty('--grid-size', gridSize + 'mm')
    
    // 缩放后调整 hiprint-printPanel 尺寸，使其适应缩放后的内容
    // transform: scale 不会改变元素布局尺寸，需要手动调整父容器
    nextTick(() => {
      const panels = document.querySelectorAll('.hiprint-printPanel')
      panels.forEach((panel) => {
        const paper = panel.querySelector('.hiprint-printPaper') as HTMLElement
        if (paper) {
          const panelEl = panel as HTMLElement
          // 获取 paper 的原始尺寸（未缩放时的布局尺寸）
          const originalWidth = paper.offsetWidth
          const originalHeight = paper.offsetHeight
          // 根据缩放比例计算 panel 应有的尺寸
          panelEl.style.width = (originalWidth * scale) + 'px'
          panelEl.style.height = (originalHeight * scale) + 'px'
        }
      })
    })
  }

  function updateTemplate(panelTemplate: any) {
    hiprintTemplate.value?.update?.(panelTemplate)
  }

  return {
    hiprintTemplate,
    isReady,
    activeElement,
    init,
    destroy,
    print,
    toPdf,
    setPaper,
    rotatePaper,
    setZoom,
    updateTemplate,
  }
}
