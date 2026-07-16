import { customElementGroups } from '../config/custom-elements'

export default function (hiprint) {
  return function () {
    var addElementTypes = function (context) {
      context.removePrintElementTypes('customModule')
      var groups = customElementGroups.map(function (group) {
        return new hiprint.PrintElementTypeGroup(
          group.name,
          group.elements.map(function (el) {
            var element = {
              tid: el.tid,
              title: el.title,
              type: el.type,
            }
            if (el.data !== undefined) element.data = el.data
            if (el.options) element.options = el.options
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
