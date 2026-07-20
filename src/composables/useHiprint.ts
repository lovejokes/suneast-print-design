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
        willOutOfBounds: false,
      })
    } catch (e) {
      console.error('PrintTemplate 创建失败:', e)
      return
    }

    try {
      hiprintTemplate.value.design(containerSelector, { grid: true })

      // ── fixed → draggable 联动 ──
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
          const orig = proto.updateOption
          proto.updateOption = function (this: any, o: string, v: any, b?: boolean) {
            orig.call(this, o, v, b)
            if (o === 'fixed') {
              this.options.draggable = !v
              if (this.designTarget) {
                $(this.designTarget).hidraggable('update', { draggable: !v })
              }
            }
          }
        }
        return true
      }

      try {
        if (!applyFixedPatch()) {
          // 初始无元素，通过 MutationObserver 在首个元素添加后 patch
          const paper = document.querySelector('.hiprint-printPaper-content')
          if (paper) {
            const mo = new MutationObserver(() => {
              if (applyFixedPatch()) mo.disconnect()
            })
            mo.observe(paper, { childList: true })
          }
        }
      } catch (e) {
        console.error('fixed→draggable patch 失败:', e)
      }

      isReady.value = true

      // 清除 .hiprint-printPaper-content 上 hiprint 自动注入的 CSS left/top，
      // 统一由 hidraggable 在元素层面处理四个方向的偏移钳位
      document.querySelectorAll('.hiprint-printPaper-content').forEach((el: any) => {
        el.style.left = ''
        el.style.top = ''
      })

      // ── 初始化 & 保存 rightOffset / bottomOffset ──
      const template = hiprintTemplate.value as any
      if (template && template.printPanels) {
        const $ = window.$

        template.printPanels.forEach((panel: any) => {
          const defaults = (window as any).HIPRINT_CONFIG?.panel?.default
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
