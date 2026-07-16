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
    hiprint.init({
      providers: providers,
    })

    hiprintTemplate.value = new hiprint.PrintTemplate({
      template: panelTemplate,
      settingContainer: settingContainerSelector,
      ...options,
    })

    hiprintTemplate.value.design(containerSelector, { grid: true })
    isReady.value = true
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

  function exportPdf(): Promise<Blob> {
    return hiprintTemplate.value?.exportPdf?.() || Promise.reject('not available')
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
    exportPdf,
    setPaper,
    rotatePaper,
    setZoom,
    updateTemplate,
  }
}
