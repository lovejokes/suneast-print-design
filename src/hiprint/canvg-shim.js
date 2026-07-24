// Shim: hiprint.bundle.js does "import Canvg from 'canvg'"
// canvg v4 uses named exports, so we re-export the Canvg class as default
// Must use full path to avoid Vite alias loop
import { Canvg } from '../../node_modules/canvg/dist/index.js'
export default Canvg
