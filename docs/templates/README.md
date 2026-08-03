# 打印模板（JSON）

每个 JSON 文件是一份完整的 hiprint 模板（含 `panels`）。

## 已有模板

| 文件 | 名称 | 说明 |
|------|------|------|
| `sales-contract.json` | 销售合同 | 当前主模板（原 `docs/template.json`） |

## 如何新增

1. 在设计器中做好版式，导出 JSON，或直接复制现有文件修改  
2. 保存到本目录，例如 `my-order.json`  
3. 在 `src/data/templates.ts` 中注册：

```ts
import myOrder from '../../docs/templates/my-order.json'

const jsonTemplates: TemplateDef[] = [
  // ...
  {
    id: 'my-order',
    name: '我的订单',
    description: '一句话说明',
    paperType: 'A4',
    template: myOrder as PanelTemplate,
  },
]
```

4. 刷新后打开「模板」即可看到新卡片
