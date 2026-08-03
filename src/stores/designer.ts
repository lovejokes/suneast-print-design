import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import defaultTemplateJson from '../../docs/templates/sales-contract.json'

export interface PanelTemplate {
  panels: Array<{
    index: number
    name: string | number
    height: number
    width: number
    paperHeader?: number
    paperFooter?: number
    repeatHeaderFooter?: boolean
    printElements: Array<Record<string, unknown>>
    paperNumberLeft?: number
    paperNumberTop?: number
    watermarkOptions?: Record<string, unknown>
  }>
}

const DEFAULT_PANEL: PanelTemplate = defaultTemplateJson as PanelTemplate

export const useDesignerStore = defineStore('designer', () => {
  const template = reactive<PanelTemplate>(JSON.parse(JSON.stringify(DEFAULT_PANEL)))
  const selectedElement = ref<Record<string, unknown> | null>(null)
  const zoom = ref(1)
  const currentPage = ref(0)
  const gridEnabled = ref(true)
  const paperType = ref('A4')

  function selectElement(el: Record<string, unknown> | null) {
    selectedElement.value = el
  }

  function setZoom(z: number) {
    zoom.value = Math.max(0.5, Math.min(5, z))
  }

  function setPaperType(type: string) {
    paperType.value = type
  }

  function addPage() {
    const lastPanel = template.panels[template.panels.length - 1]
    const newPanel = JSON.parse(JSON.stringify(lastPanel))
    newPanel.index = template.panels.length
    newPanel.name = template.panels.length + 1
    newPanel.printElements = []
    template.panels.push(newPanel)
    currentPage.value = newPanel.index
  }

  function removePage(index: number) {
    if (template.panels.length <= 1) return
    template.panels.splice(index, 1)
    template.panels.forEach((p, i) => {
      p.index = i
      p.name = i + 1
    })
    if (currentPage.value >= template.panels.length) {
      currentPage.value = template.panels.length - 1
    }
  }

  function setCurrentPage(index: number) {
    currentPage.value = index
  }

  function clearPaper() {
    template.panels[currentPage.value].printElements = []
  }

  function importTemplate(json: PanelTemplate) {
    Object.assign(template, JSON.parse(JSON.stringify(json)))
    currentPage.value = 0
  }

  function exportTemplate(): PanelTemplate {
    return JSON.parse(JSON.stringify(template))
  }

  function newTemplate() {
    Object.assign(template, JSON.parse(JSON.stringify(DEFAULT_PANEL)))
    currentPage.value = 0
    selectedElement.value = null
  }

  return {
    template,
    selectedElement,
    zoom,
    currentPage,
    gridEnabled,
    paperType,
    selectElement,
    setZoom,
    setPaperType,
    addPage,
    removePage,
    setCurrentPage,
    clearPaper,
    importTemplate,
    exportTemplate,
    newTemplate,
  }
})
