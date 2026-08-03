export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('defaultModule')
      context.addPrintElementTypes('defaultModule', [
        new hiprint.PrintElementTypeGroup('常用', [
          {
            tid: 'defaultModule.text',
            text: '文本',
            data: '',
            type: 'text',
          },
          {
            tid: 'defaultModule.image',
            text: '图片',
            data: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMGYwZjAiIHJ4PSI0Ii8+PHRleHQgeD0iNjAiIHk9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjYmJiIiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+5Zu+54mHPC90ZXh0Pjwvc3ZnPg==',
            type: 'image',
          },
          {
            tid: 'defaultModule.longText',
            text: '文本域',
            data: '长文本内容',
            type: 'longText',
            options: {
              lineHeight: 15,
              height: 18,
            },
          },
          {
            tid: 'defaultModule.table',
            field: 'table',
            text: '表格',
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
            text: '空白表格',
            type: 'table',
            columns: [[
              { title: '列一', field: '', width: 100 },
              { title: '列二', field: '', width: 100 },
            ]],
          },
        ]),
        new hiprint.PrintElementTypeGroup('辅助', [
          {
            tid: 'defaultModule.hline',
            text: '横线',
            type: 'hline',
          },
          {
            tid: 'defaultModule.vline',
            text: '竖线',
            type: 'vline',
          },
          {
            tid: 'defaultModule.rect',
            text: '矩形',
            type: 'rect',
          },
          {
            tid: 'defaultModule.oval',
            text: '椭圆',
            type: 'oval',
          },
          {
            tid: 'defaultModule.barcode',
            text: '条形码',
            type: 'barcode',
          },
          {
            tid: 'defaultModule.qrcode',
            text: '二维码',
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
