import { customElementGroups } from '../config/custom-elements'

export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('customModule')
      var groups = customElementGroups.map(function (group) {
        return new hiprint.PrintElementTypeGroup(
          group.name,
          group.elements.map(function (el) {
            var opts = el.options
            var element = {
              tid: el.tid,
              text: el.title,
              type: el.type,
            }
            // 字段元素：画布上显示 @字段名（实际值）
            if (opts && opts.field) {
              element.data = '@' + opts.field + '（' + (opts.testData || '') + '）'
            } else if (el.data !== undefined) {
              element.data = el.data
            }
            if (opts) element.options = opts
            return element
          })
        )
      })
      context.addPrintElementTypes('customModule', groups)
    }
    return {
      addElementTypes: addElementTypes,
    }
  }
}
