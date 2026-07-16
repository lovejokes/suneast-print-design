export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('defaultModule')
      context.addPrintElementTypes('defaultModule', [
        new hiprint.PrintElementTypeGroup('常用', [
          {
            tid: 'defaultModule.text',
            title: '文本',
            data: '',
            type: 'text',
          },
          {
            tid: 'defaultModule.image',
            title: '图片',
            data: '',
            type: 'image',
          },
          {
            tid: 'defaultModule.longText',
            title: '长文',
            data: '长文本内容',
            type: 'longText',
          },
          {
            tid: 'defaultModule.table',
            field: 'table',
            title: '表格',
            type: 'table',
            groupFields: ['name'],
            columns: [
              [
                { title: '行号', fixed: true, rowspan: 2, field: 'id', width: 70 },
                { title: '人员信息', colspan: 2 },
                { title: '销售统计', colspan: 2 },
              ],
              [
                { title: '姓名', align: 'left', field: 'name', width: 100 },
                { title: '性别', field: 'gender', width: 100 },
                { title: '销售数量', field: 'count', width: 100 },
                { title: '销售金额', field: 'amount', width: 100 },
              ],
            ],
            editable: true,
            columnDisplayEditable: true,
            columnDisplayIndexEditable: true,
            columnTitleEditable: true,
            columnResizable: true,
            columnAlignEditable: true,
            isEnableEditField: true,
            isEnableContextMenu: true,
            isEnableInsertRow: true,
            isEnableDeleteRow: true,
            isEnableInsertColumn: true,
            isEnableDeleteColumn: true,
            isEnableMergeCell: true,
          },
          {
            tid: 'defaultModule.emptyTable',
            title: '空白表格',
            type: 'table',
            columns: [[
              { title: '', field: '', width: 100 },
              { title: '', field: '', width: 100 },
            ]],
          },
          {
            tid: 'defaultModule.customText',
            title: '自定义文本',
            customText: '自定义文本',
            custom: true,
            type: 'text',
          },
        ]),
        new hiprint.PrintElementTypeGroup('辅助', [
          {
            tid: 'defaultModule.hline',
            title: '横线',
            type: 'hline',
          },
          {
            tid: 'defaultModule.vline',
            title: '竖线',
            type: 'vline',
          },
          {
            tid: 'defaultModule.rect',
            title: '矩形',
            type: 'rect',
          },
          {
            tid: 'defaultModule.oval',
            title: '椭圆',
            type: 'oval',
          },
          {
            tid: 'defaultModule.barcode',
            title: '条形码',
            type: 'barcode',
          },
          {
            tid: 'defaultModule.qrcode',
            title: '二维码',
            type: 'qrcode',
          },
        ]),
      ])
    }
    return {
      addElementTypes: addElementTypes,
    }
  }
}
