export interface TemplateDef {
  name: string
  description: string
  paperType: string
  paperWidth: number
  paperHeight: number
  canvasHeight: number
  printElements: any[]
  previewData: Record<string, any>
}

/** 创建居中文本 title option — 用于模板中的标题行 */
function titleOpts(opts: Record<string, any>): Record<string, any> {
  return {
    height: 18,
    fontSize: 14,
    fontWeight: '700',
    hideTitle: true,
    zIndex: 0,
    ...opts,
  }
}

/** 创建字段 option — 用于业务字段组件（绑定 field） */
function fieldOpts(field: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    height: 16,
    fontSize: 12,
    hideTitle: true,
    zIndex: 0,
    field,
    ...overrides,
  }
}

/** 创建普通文本 option */
function textOpts(data: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    height: 16,
    fontSize: 12,
    hideTitle: true,
    zIndex: 0,
    data,
    testData: data,
    ...overrides,
  }
}

// ============================================================
// 模板定义
// ============================================================

export const templateList: TemplateDef[] = [
  // ── 模板 1：采购订单 ──
  {
    name: '采购订单',
    description: '标准采购单布局，含表头、订单信息、商品表格、金额、签字',
    paperType: 'A4',
    paperWidth: 210,
    paperHeight: 297,
    canvasHeight: 297,
    printElements: [
      {
        tid: 'customModule.header',
        type: 'text',
        options: titleOpts({
          left: 197.5,
          top: 30,
          width: 200,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          data: '采购订单',
          testData: '采购订单',
        }),
      },
      {
        tid: 'customModule.orderNo',
        type: 'text',
        options: fieldOpts('orderNo', {
          left: 40,
          top: 70,
          width: 180,
          testData: 'PO-2024-00158',
        }),
      },
      {
        tid: 'customModule.date',
        type: 'text',
        options: fieldOpts('date', {
          left: 395,
          top: 70,
          width: 160,
          textAlign: 'right',
          testData: '2024-07-21',
        }),
      },
      {
        tid: 'customModule.customerName',
        type: 'text',
        options: fieldOpts('customerName', {
          left: 40,
          top: 98,
          width: 250,
          testData: '深圳日东科技有限公司',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('供应商：', {
          left: 40,
          top: 122,
          width: 60,
          fontWeight: '700',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('广东优品制造有限公司', {
          left: 100,
          top: 122,
          width: 200,
        }),
      },
      {
        tid: 'customModule.table',
        type: 'table',
        options: {
          left: 40,
          top: 155,
          width: 515,
          height: 400,
          field: 'table',
          fields: [
            { text: '商品名称', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '规格', field: 'GG' },
            { text: '单价(元)', field: 'DJ' },
            { text: '金额(元)', field: 'JE' },
          ],
          tableHeaderRowHeight: 25,
          tableBodyRowHeight: 25,
          hideTitle: true,
          zIndex: 0,
          columns: [
            [
              { title: '商品名称', field: 'NAME', width: 180 },
              { title: '数量', field: 'SL', width: 70 },
              { title: '规格', field: 'GG', width: 80 },
              { title: '单价(元)', field: 'DJ', width: 85 },
              { title: '金额(元)', field: 'JE', width: 100 },
            ],
          ],
        },
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('合计金额：', {
          left: 345,
          top: 570,
          width: 80,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
      {
        tid: 'customModule.amount',
        type: 'text',
        options: fieldOpts('amount', {
          left: 425,
          top: 570,
          width: 130,
          textAlign: 'right',
          fontWeight: '700',
          fontSize: 14,
          testData: '¥82,650.00',
        }),
      },
      {
        tid: 'customModule.signer',
        type: 'text',
        options: fieldOpts('signer', {
          left: 395,
          top: 610,
          width: 160,
          textAlign: 'right',
          testData: '张三',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('审批人签字：', {
          left: 305,
          top: 610,
          width: 90,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
    ],
    previewData: {
      orderNo: 'PO-2024-00158',
      date: '2024-07-21',
      customerName: '深圳日东科技有限公司',
      amount: '¥82,650.00',
      signer: '张三',
      table: [
        { NAME: '精密轴承组件 A-200', SL: 50, GG: 'Φ20×47×14mm', DJ: 185.00, JE: 9250.00 },
        { NAME: '不锈钢法兰 DN50', SL: 200, GG: '304/PN16', DJ: 86.00, JE: 17200.00 },
        { NAME: '液压油缸密封圈', SL: 500, GG: 'NBR 70HS', DJ: 24.50, JE: 12250.00 },
        { NAME: '高强度螺栓 M16×80', SL: 1000, GG: '8.8级/镀锌', DJ: 3.80, JE: 3800.00 },
        { NAME: '伺服电机驱动器', SL: 15, GG: '220V/750W', DJ: 2350.00, JE: 35250.00 },
        { NAME: '铝合金型材 6063', SL: 80, GG: '40×40×3mm×6m', DJ: 122.50, JE: 9800.00 },
      ],
    },
  },

  // ── 模板 2：发货单 ──
  {
    name: '发货单',
    description: '简洁发货单，含客户信息、发货明细表格、备注区域',
    paperType: 'A4',
    paperWidth: 210,
    paperHeight: 297,
    canvasHeight: 297,
    printElements: [
      {
        tid: 'customModule.header',
        type: 'text',
        options: titleOpts({
          left: 197.5,
          top: 25,
          width: 200,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          data: '发 货 单',
          testData: '发 货 单',
        }),
      },
      {
        tid: 'customModule.orderNo',
        type: 'text',
        options: fieldOpts('orderNo', {
          left: 40,
          top: 65,
          width: 200,
          testData: 'DL-20240721-0088',
        }),
      },
      {
        tid: 'customModule.date',
        type: 'text',
        options: fieldOpts('date', {
          left: 395,
          top: 65,
          width: 160,
          textAlign: 'right',
          testData: '2024-07-21',
        }),
      },
      {
        tid: 'customModule.customerName',
        type: 'text',
        options: fieldOpts('customerName', {
          left: 40,
          top: 93,
          width: 250,
          testData: '广州恒达贸易有限公司',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('收货地址：广东省广州市天河区体育西路100号', {
          left: 40,
          top: 117,
          width: 400,
          fontSize: 11,
          color: '#666',
        }),
      },
      {
        tid: 'customModule.table',
        type: 'table',
        options: {
          left: 40,
          top: 150,
          width: 515,
          height: 410,
          field: 'table',
          fields: [
            { text: '商品名称', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '规格', field: 'GG' },
            { text: '单价(元)', field: 'DJ' },
            { text: '金额(元)', field: 'JE' },
          ],
          tableHeaderRowHeight: 25,
          tableBodyRowHeight: 25,
          hideTitle: true,
          zIndex: 0,
          columns: [
            [
              { title: '商品名称', field: 'NAME', width: 180 },
              { title: '数量', field: 'SL', width: 70 },
              { title: '规格', field: 'GG', width: 80 },
              { title: '单价(元)', field: 'DJ', width: 85 },
              { title: '金额(元)', field: 'JE', width: 100 },
            ],
          ],
        },
      },
      {
        tid: 'customModule.amount',
        type: 'text',
        options: fieldOpts('amount', {
          left: 425,
          top: 575,
          width: 130,
          textAlign: 'right',
          fontWeight: '700',
          fontSize: 14,
          testData: '¥56,240.00',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('合计：', {
          left: 365,
          top: 575,
          width: 60,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('备注：如有质量问题请在48小时内联系，逾期不予受理。', {
          left: 40,
          top: 615,
          width: 400,
          fontSize: 10,
          color: '#999',
        }),
      },
      {
        tid: 'customModule.signer',
        type: 'text',
        options: fieldOpts('signer', {
          left: 395,
          top: 650,
          width: 160,
          textAlign: 'right',
          testData: '李四',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('发货人：', {
          left: 320,
          top: 650,
          width: 75,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
    ],
    previewData: {
      orderNo: 'DL-20240721-0088',
      date: '2024-07-21',
      customerName: '广州恒达贸易有限公司',
      amount: '¥56,240.00',
      signer: '李四',
      table: [
        { NAME: '工业级交换机 24口', SL: 30, GG: '千兆/机架式', DJ: 1200.00, JE: 36000.00 },
        { NAME: '超五类网线', SL: 50, GG: '305m/箱', DJ: 380.00, JE: 19000.00 },
        { NAME: '光纤跳线 LC-LC', SL: 200, GG: '单模/3m', DJ: 6.20, JE: 1240.00 },
      ],
    },
  },

  // ── 模板 3：报价单 ──
  {
    name: '报价单',
    description: '正式报价单，含公司信息、报价明细、有效期、条款说明',
    paperType: 'A4',
    paperWidth: 210,
    paperHeight: 297,
    canvasHeight: 297,
    printElements: [
      {
        tid: 'customModule.header',
        type: 'text',
        options: titleOpts({
          left: 197.5,
          top: 20,
          width: 200,
          fontSize: 20,
          fontWeight: '700',
          textAlign: 'center',
          data: '报 价 单',
          testData: '报 价 单',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('QUOTATION', {
          left: 197.5,
          top: 42,
          width: 200,
          fontSize: 10,
          textAlign: 'center',
          color: '#999',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('致：', {
          left: 40,
          top: 70,
          width: 30,
          fontWeight: '700',
          fontSize: 12,
        }),
      },
      {
        tid: 'customModule.customerName',
        type: 'text',
        options: fieldOpts('customerName', {
          left: 70,
          top: 70,
          width: 200,
          testData: '北京华信科技有限公司',
        }),
      },
      {
        tid: 'customModule.date',
        type: 'text',
        options: fieldOpts('date', {
          left: 395,
          top: 70,
          width: 160,
          textAlign: 'right',
          testData: '2024-07-21',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('报价有效期：30天', {
          left: 395,
          top: 90,
          width: 160,
          fontSize: 10,
          textAlign: 'right',
          color: '#999',
        }),
      },
      {
        tid: 'customModule.table',
        type: 'table',
        options: {
          left: 40,
          top: 115,
          width: 515,
          height: 380,
          field: 'table',
          fields: [
            { text: '项目名称', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '规格', field: 'GG' },
            { text: '单价(元)', field: 'DJ' },
            { text: '金额(元)', field: 'JE' },
          ],
          tableHeaderRowHeight: 25,
          tableBodyRowHeight: 25,
          hideTitle: true,
          zIndex: 0,
          columns: [
            [
              { title: '项目名称', field: 'NAME', width: 180 },
              { title: '数量', field: 'SL', width: 70 },
              { title: '规格', field: 'GG', width: 80 },
              { title: '单价(元)', field: 'DJ', width: 85 },
              { title: '金额(元)', field: 'JE', width: 100 },
            ],
          ],
        },
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('小计：', {
          left: 365,
          top: 510,
          width: 60,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
      {
        tid: 'customModule.amount',
        type: 'text',
        options: fieldOpts('amount', {
          left: 425,
          top: 510,
          width: 130,
          textAlign: 'right',
          fontWeight: '700',
          fontSize: 14,
          testData: '¥128,500.00',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('含税（增值税 13%）', {
          left: 425,
          top: 530,
          width: 130,
          fontSize: 10,
          textAlign: 'right',
          color: '#999',
        }),
      },
      {
        tid: 'defaultModule.longText',
        type: 'longText',
        options: {
          left: 40,
          top: 560,
          width: 515,
          height: 60,
          fontSize: 10,
          color: '#666',
          data: '条款说明：\n1. 以上报价含13%增值税专用发票。\n2. 付款方式：合同签订后预付30%，发货前付清70%。\n3. 交货期：收到预付款后15个工作日内。\n4. 质保期：验收合格后12个月。',
          testData: '条款说明：\n1. 以上报价含13%增值税专用发票。\n2. 付款方式：合同签订后预付30%，发货前付清70%。\n3. 交货期：收到预付款后15个工作日内。\n4. 质保期：验收合格后12个月。',
          hideTitle: true,
          zIndex: 0,
        },
      },
      {
        tid: 'customModule.signer',
        type: 'text',
        options: fieldOpts('signer', {
          left: 395,
          top: 640,
          width: 160,
          textAlign: 'right',
          testData: '王经理',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('报价人：', {
          left: 325,
          top: 640,
          width: 70,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
    ],
    previewData: {
      customerName: '北京华信科技有限公司',
      date: '2024-07-21',
      amount: '¥128,500.00',
      signer: '王经理',
      table: [
        { NAME: '智能仓储管理系统', SL: 1, GG: 'V3.0 企业版', DJ: 65000.00, JE: 65000.00 },
        { NAME: 'RFID读写器', SL: 20, GG: 'UHF/RS232', DJ: 1850.00, JE: 37000.00 },
        { NAME: '电子标签', SL: 5000, GG: 'UHF/PCB', DJ: 2.50, JE: 12500.00 },
        { NAME: '部署实施服务', SL: 1, GG: '含培训', DJ: 14000.00, JE: 14000.00 },
      ],
    },
  },

  // ── 模板 4：简易收据 ──
  {
    name: '简易收据',
    description: '简洁收据小票，适合 A5/小票纸，含抬头、金额、签字',
    paperType: 'A5',
    paperWidth: 148,
    paperHeight: 210,
    canvasHeight: 210,
    printElements: [
      {
        tid: 'customModule.header',
        type: 'text',
        options: titleOpts({
          left: 74,
          top: 20,
          width: 148,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
          data: '收 据',
          testData: '收 据',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('RECEIPT', {
          left: 74,
          top: 40,
          width: 148,
          fontSize: 9,
          textAlign: 'center',
          color: '#999',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('No.', {
          left: 30,
          top: 70,
          width: 25,
          fontWeight: '700',
          fontSize: 11,
        }),
      },
      {
        tid: 'customModule.orderNo',
        type: 'text',
        options: fieldOpts('orderNo', {
          left: 55,
          top: 70,
          width: 180,
          fontSize: 11,
          testData: 'SK-20240721-0012',
        }),
      },
      {
        tid: 'customModule.date',
        type: 'text',
        options: fieldOpts('date', {
          left: 260,
          top: 70,
          width: 130,
          fontSize: 11,
          textAlign: 'right',
          testData: '2024-07-21',
        }),
      },
      {
        tid: 'defaultModule.hline',
        type: 'hline',
        options: { left: 30, top: 95, width: 360, height: 1, zIndex: 0 },
      },
      {
        tid: 'customModule.customerName',
        type: 'text',
        options: fieldOpts('customerName', {
          left: 30,
          top: 110,
          width: 250,
          fontSize: 12,
          fontWeight: '700',
          testData: '个人客户',
        }),
      },
      {
        tid: 'customModule.table',
        type: 'table',
        options: {
          left: 30,
          top: 140,
          width: 360,
          height: 200,
          field: 'table',
          fields: [
            { text: '项目', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '单价', field: 'DJ' },
            { text: '金额', field: 'JE' },
          ],
          tableHeaderRowHeight: 22,
          tableBodyRowHeight: 22,
          hideTitle: true,
          zIndex: 0,
          columns: [
            [
              { title: '项目', field: 'NAME', width: 140 },
              { title: '数量', field: 'SL', width: 55 },
              { title: '单价', field: 'DJ', width: 70 },
              { title: '金额', field: 'JE', width: 95 },
            ],
          ],
        },
      },
      {
        tid: 'defaultModule.hline',
        type: 'hline',
        options: { left: 30, top: 355, width: 360, height: 1, zIndex: 0 },
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('合计（大写）：', {
          left: 30,
          top: 370,
          width: 85,
          fontWeight: '700',
          fontSize: 12,
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('叁仟捌佰陆拾圆整', {
          left: 115,
          top: 370,
          width: 180,
          fontSize: 12,
        }),
      },
      {
        tid: 'customModule.amount',
        type: 'text',
        options: fieldOpts('amount', {
          left: 290,
          top: 370,
          width: 100,
          textAlign: 'right',
          fontWeight: '700',
          fontSize: 13,
          testData: '¥3,860.00',
        }),
      },
      {
        tid: 'customModule.signer',
        type: 'text',
        options: fieldOpts('signer', {
          left: 270,
          top: 410,
          width: 120,
          textAlign: 'right',
          testData: '收款员',
        }),
      },
      {
        tid: 'defaultModule.text',
        type: 'text',
        options: textOpts('收款人：', {
          left: 200,
          top: 410,
          width: 70,
          fontWeight: '700',
          textAlign: 'right',
        }),
      },
    ],
    previewData: {
      orderNo: 'SK-20240721-0012',
      date: '2024-07-21',
      customerName: '个人客户',
      amount: '¥3,860.00',
      signer: '收款员',
      table: [
        { NAME: '办公椅', SL: 2, DJ: 580.00, JE: 1160.00 },
        { NAME: 'LED台灯', SL: 3, DJ: 380.00, JE: 1140.00 },
        { NAME: '文具套装', SL: 10, DJ: 156.00, JE: 1560.00 },
      ],
    },
  },
]
