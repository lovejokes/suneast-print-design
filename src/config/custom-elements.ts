export interface CustomElement {
  tid: string
  title: string
  type: string
  data?: string
  field?: string
  testData?: string
  options?: Record<string, unknown>
}

export interface CustomElementGroup {
  name: string
  elements: CustomElement[]
}

export const customElementGroups: CustomElementGroup[] = [
  {
    name: '业务字段',
    elements: [
      {
        tid: 'customModule.header',
        title: '单据表头',
        type: 'text',
        data: '单据表头',
        options: {
          testData: '单据表头',
          height: 17,
          fontSize: 16.5,
          fontWeight: '700',
          textAlign: 'center',
          hideTitle: true,
        },
      },
      {
        tid: 'customModule.orderNo',
        title: '订单编号',
        type: 'text',
        data: 'XS888888888',
        options: {
          field: 'orderNo',
          testData: 'XS888888888',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.customerName',
        title: '客户名称',
        type: 'text',
        data: '客户名称',
        options: {
          field: 'customerName',
          testData: '客户名称',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.date',
        title: '日期',
        type: 'text',
        data: '2023-07-16',
        options: {
          field: 'date',
          testData: '2023-07-16',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.amount',
        title: '金额',
        type: 'text',
        data: '¥0.00',
        options: {
          field: 'amount',
          testData: '¥0.00',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'right',
          textContentVerticalAlign: 'middle',
        },
      },
      {
        tid: 'customModule.barcode',
        title: '条形码',
        type: 'text',
        data: '123456789',
        options: {
          field: 'barcode',
          testData: '123456789',
          height: 32,
          fontSize: 12,
          textType: 'barcode',
        },
      },
      {
        tid: 'customModule.qrcode',
        title: '二维码',
        type: 'text',
        data: 'https://example.com',
        options: {
          field: 'qrcode',
          testData: 'https://example.com',
          height: 48,
          fontSize: 12,
          textType: 'qrcode',
        },
      },
    ],
  },
  {
    name: '表格/其他',
    elements: [
      {
        tid: 'customModule.table',
        title: '数据表格',
        type: 'table',
        options: {
          field: 'table',
          fields: [
            { text: '商品名称', field: 'NAME' },
            { text: '数量', field: 'SL' },
            { text: '规格', field: 'GG' },
            { text: '单价', field: 'DJ' },
            { text: '金额', field: 'JE' },
          ],
          columns: [
            [
              { title: '商品名称', field: 'NAME', width: 180 },
              { title: '数量', field: 'SL', width: 70 },
              { title: '规格', field: 'GG', width: 80 },
              { title: '单价(元)', field: 'DJ', width: 85 },
              { title: '金额(元)', field: 'JE', width: 100 },
            ],
          ],
          tableHeaderRowHeight: 25,
          tableBodyRowHeight: 25,
          // 预览示例数据：拖入表格后预览即可看到多行记录
          testData: [
            { NAME: '示例商品A', SL: 10, GG: 'L', DJ: 128.00, JE: 1280.00 },
            { NAME: '示例商品B', SL: 20, GG: 'XL', DJ: 256.00, JE: 5120.00 },
          ],
        },
      },
      {
        tid: 'customModule.signer',
        title: '签字',
        type: 'text',
        data: '',
        options: {
          field: 'signer',
          testData: '',
          height: 16,
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'left',
          textContentVerticalAlign: 'middle',
        },
      },
    ],
  },
]
