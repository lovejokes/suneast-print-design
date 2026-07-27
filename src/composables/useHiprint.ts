import { ref, type Ref } from 'vue'

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
        })
      }
      document.addEventListener('mouseup', onDocMouseUp, true)

      // ── Ctrl+C / Ctrl+V 快捷键 ──
      function onCopyPasteKeyDown(e: KeyboardEvent) {
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
          // Ctrl+C: 收集所有选中元素写入 #copyArea（包含表格，含 id/templateId）
          let copyArea = $('#copyArea')
          if (!copyArea.length) {
            copyArea = $('<textarea id="copyArea" style="position:absolute;left:0;top:0;opacity:0"></textarea>')
            $('body').append(copyArea)
          }
          // 清空上一次复制数据
          copyArea.text('')
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
            // 格式与原生 copyJson 一致：必须包含 id / templateId
            const copyData = selected.map(function (el: any) {
              return {
                id: el.id,
                templateId: el.templateId,
                options: el.options?.getPrintElementOptionEntity?.() || el.options,
                printElementType: el.printElementType?.getPrintElementTypeEntity?.() || el.printElementType,
              }
            })
            copyArea.text(JSON.stringify(copyData))
            copyArea.attr('data-count', String(selected.length))
          }
          e.preventDefault()
          // 阻止冒泡，防止 hiprint 原生 copyJson 覆盖 #copyArea
          e.stopPropagation()
        }
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 86) {
          // Ctrl+V: 优先使用原生 pasteJson（内部通过 id 定位原元素克隆）
          const copyArea = $('#copyArea')
          if (copyArea.length && copyArea.text()) {
            e.preventDefault()
            e.stopPropagation()
            // 先取消所有元素的选中状态
            deselectAll(ep)
            // 记录粘贴前的元素数量，用于定位新元素
            const beforeCount = ep.printElements.length
            // 解析复制快照，用于粘贴后覆盖 clone 带来的 live 状态
            let copySnapshots: any[] = []
            try {
              copySnapshots = JSON.parse(copyArea.text())
            } catch { copySnapshots = [] }
            try {
              ep.pasteJson(e)
            } catch {
              manualPaste(ep, tpl)
            }
            // 选中新粘贴的元素（pasteJson 新增的在数组末尾），
            // 并用复制快照覆盖 clone 的浅拷贝，确保粘贴得到的是复制时状态而非实时状态。
            const afterCount = ep.printElements.length
            for (let i = beforeCount; i < afterCount; i++) {
              const newEl = ep.printElements[i]
              const snap = copySnapshots[i - beforeCount]
              if (snap?.options && newEl?.options) {
                // 保留 pasteJson 设置的偏移位置（已 +10）
                const pasteLeft = newEl.options.getLeft?.()
                const pasteTop = newEl.options.getTop?.()
                // 深拷贝快照中的所有属性到新元素
                const saved = snap.options
                Object.keys(saved).forEach(function (k) {
                  try {
                    newEl.options[k] = JSON.parse(JSON.stringify(saved[k]))
                  } catch {
                    newEl.options[k] = saved[k]
                  }
                })
                // 恢复偏移位置
                if (pasteLeft != null) newEl.options.setLeft?.(pasteLeft)
                if (pasteTop != null) newEl.options.setTop?.(pasteTop)
                newEl.updateDesignViewFromOptions?.()
              }
              selectElement(newEl)
            }
          }
        }
        // Delete 键删除
        if (e.keyCode === 46 && !(e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable]')) {
          e.preventDefault()
          deleteSelectedElements(ep, tpl)
        }
      }
      document.addEventListener('keydown', onCopyPasteKeyDown, true)

      // 手动粘贴（降级 + 右键菜单调用）
      function manualPaste(ep: any, tpl: any) {
        const $ = (window as any).$
        const copyArea = $('#copyArea')
        if (!copyArea.length || !copyArea.text()) return
        try {
          const copyData = JSON.parse(copyArea.text())
          if (!Array.isArray(copyData) || !copyData.length) return
          const baseLeft = copyData[0].options?.left ?? 100
          const baseTop = copyData[0].options?.top ?? 100
          const pastedEls: any[] = []
          copyData.forEach(function (item: any, idx: number) {
            const newOptions = JSON.parse(JSON.stringify(item.options))
            newOptions.left = (newOptions.left ?? baseLeft) + 20 * (idx + 1)
            newOptions.top = (newOptions.top ?? baseTop) + 20 * (idx + 1)
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
      document.addEventListener('contextmenu', onContextMenu, true)

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
            const target = e.target as HTMLElement
            if (target.closest('.hiprint-printElement')) return
            const $pt = (window as any).$
            if ($pt) {
              $pt(containerSelector).find('div[panelindex]').removeClass('selected').css({ display: 'none' })
              $pt('.hiprint-printElement-table.selected').removeClass('selected')
                .find('.resizebtn').css({ display: 'none' })
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

      try {
        const fixedOk = applyFixedPatch()
        const clampOk = applyResizeClampPatch()
        applyUpdateSizeAndPosClampPatch()
        if (!fixedOk || !clampOk) {
          const paper = document.querySelector('.hiprint-printPaper-content')
          if (paper) {
            const mo = new MutationObserver((mutations) => {
              applyFixedPatch()
              applyResizeClampPatch()
              applyUpdateSizeAndPosClampPatch()
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
              cb(values)
              const p = (window as any).__activePanel
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
