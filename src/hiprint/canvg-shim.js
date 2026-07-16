// Shim: hiprint.bundle.js imports "import Canvg from 'canvg'"
// modern canvg uses named exports, so we re-wrap with a default
import * as CanvgModule from 'canvg'
export default CanvgModule
