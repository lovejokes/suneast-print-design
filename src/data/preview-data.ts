/** 打印预览时使用的写死测试数据，覆盖所有预设字段 */
export const PREVIEW_DATA: Record<string, unknown> = {
  // ── 表单字段 ──
  orderNo: 'PO-2024-0731',
  date: '2024-07-31',
  customerName: '深圳日东科技有限公司',
  amount: '¥128,600.00',
  signer: '张三',
  supplier: '广州恒达电子有限公司',
  shipper: '顺丰速运',
  address: '广东省深圳市南山区科技园南路 88 号',
  remark: '1. 随货附质检报告及合格证。\n2. 收货时请核对装箱单与实物数量，如有差异请在 48 小时内联系。\n3. 本订单不含安装调试费用，如需现场服务请提前预约。\n4. 质保期自发货之日起 12 个月，易损件不在质保范围内。',
  validity: '2024-08-15',
  contact: '李经理',
  phone: '13800138000',

  // ── 条码 / 二维码 ──
  barcode: 'PO20240731001',
  qrcode: 'https://example.com/track/PO20240731001',

  // ── 表格数据 ──
  table: [
    { id: 1, NAME: '精密轴承组件 A-200', SL: 50, GG: 'Φ20×47×14mm', DJ: 185.0, JE: 9250.0, UNIT: '个', BRAND: 'SKF', MODEL: 'A-200', LOCATION: 'A-01-02' },
    { id: 2, NAME: '不锈钢法兰 DN50', SL: 200, GG: '304/PN16', DJ: 86.0, JE: 17200.0, UNIT: '个', BRAND: '日标', MODEL: 'DN50-PN16', LOCATION: 'B-03-05' },
    { id: 3, NAME: '液压油缸密封圈', SL: 30, GG: '80×65×9mm', DJ: 420.0, JE: 12600.0, UNIT: '套', BRAND: 'NOK', MODEL: 'USH-80', LOCATION: 'C-02-01' },
    { id: 4, NAME: '高强度螺栓 M16×80', SL: 500, GG: 'M16×80/8.8级', DJ: 3.5, JE: 1750.0, UNIT: '支', BRAND: '晋亿', MODEL: 'GB5783-M16×80', LOCATION: 'A-04-03' },
    { id: 5, NAME: '铜芯电缆 RVV 3×2.5', SL: 300, GG: 'RVV 3×2.5mm²', DJ: 12.8, JE: 3840.0, UNIT: '米', BRAND: '远东', MODEL: 'RVV-3×2.5', LOCATION: 'D-01-06' },
  ],
}