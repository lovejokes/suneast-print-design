export function useTemplate() {
  function exportJSON(template: any): string {
    return JSON.stringify(template, null, 2)
  }

  function importJSON(jsonStr: string): any {
    try {
      const parsed = JSON.parse(jsonStr)
      // 接受新旧两种格式：扁平模板 或 panels 包装
      if (!parsed.paperWidth && (!parsed.panels || !Array.isArray(parsed.panels))) {
        throw new Error('无效的模板格式')
      }
      return parsed
    } catch (e) {
      console.error('导入模板失败:', e)
      throw e
    }
  }

  function downloadJSON(template: any, filename: string = 'template.json') {
    const json = exportJSON(template)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function readFileAsJSON(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = importJSON(e.target?.result as string)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    })
  }

  return {
    exportJSON,
    importJSON,
    downloadJSON,
    readFileAsJSON,
  }
}
