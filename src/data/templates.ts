/**
 * 模板注册表
 *
 * 新增 JSON 模板步骤：
 * 1. 把完整 hiprint 模板（含 panels）放到 docs/templates/xxx.json
 * 2. 在下方 import，并追加到 jsonTemplates 数组
 *
 * 示例：
 *   import myTpl from '../../docs/templates/my-tpl.json'
 *   { id: 'my-tpl', name: '我的模板', description: '...', paperType: 'A4', template: myTpl }
 */
import type { PanelTemplate } from '@/stores/designer'
import salesContract from '../../docs/templates/sales-contract.json'
import template2 from '../../docs/templates/template2.json'
import template3 from '../../docs/templates/template3.json'

export interface TemplateDef {
  id: string
  name: string
  description: string
  paperType: string
  /** 完整 hiprint 模板（panels 结构） */
  template: PanelTemplate
  previewData?: Record<string, unknown>
}

/** JSON 文件模板（后续新模板加这里） */
const jsonTemplates: TemplateDef[] = [
  {
    id: 'sales-contract',
    name: '销售合同',
    description: '日东销售合同书，含品名表格、条款、签章与页尾',
    paperType: 'A4',
    template: salesContract as PanelTemplate,
  },
  {
    id: 'template2',
    name: '采购订单',
    description: '采购订单布局（docs/templates/template2.json）',
    paperType: 'A4',
    template: template2 as PanelTemplate,
  },
  {
    id: 'template3',
    name: '标签打印',
    description: '100×40mm 标签，含二维码与订单信息（docs/templates/template3.json）',
    paperType: 'A4',
    template: template3 as PanelTemplate,
  },
]

/** 模板选择弹窗列表 */
export const templateList: TemplateDef[] = [...jsonTemplates]

export function getTemplateById(id: string): TemplateDef | undefined {
  return templateList.find((t) => t.id === id)
}
