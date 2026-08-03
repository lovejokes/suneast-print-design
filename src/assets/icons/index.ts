export { default as LogoIcon } from './LogoIcon.vue'
export { default as TextIcon } from './TextIcon.vue'
export { default as ImageIcon } from './ImageIcon.vue'
export { default as TableIcon } from './TableIcon.vue'
export { default as TableLayoutIcon } from './TableLayoutIcon.vue'
export { default as BarcodeIcon } from './BarcodeIcon.vue'
export { default as QrcodeIcon } from './QrcodeIcon.vue'
export { default as LineIcon } from './LineIcon.vue'
export { default as VLineIcon } from './VLineIcon.vue'
export { default as RectIcon } from './RectIcon.vue'
export { default as OvalIcon } from './OvalIcon.vue'
export { default as AlignLeftIcon } from './AlignLeftIcon.vue'
export { default as AlignCenterIcon } from './AlignCenterIcon.vue'
export { default as AlignRightIcon } from './AlignRightIcon.vue'
export { default as AlignTopIcon } from './AlignTopIcon.vue'
export { default as AlignMiddleIcon } from './AlignMiddleIcon.vue'
export { default as AlignBottomIcon } from './AlignBottomIcon.vue'
export { default as BringForwardIcon } from './BringForwardIcon.vue'
export { default as SendBackwardIcon } from './SendBackwardIcon.vue'
export { default as UndoIcon } from './UndoIcon.vue'
export { default as RedoIcon } from './RedoIcon.vue'
export { default as ZoomInIcon } from './ZoomInIcon.vue'
export { default as ZoomOutIcon } from './ZoomOutIcon.vue'
export { default as GridIcon } from './GridIcon.vue'
export { default as SaveIcon } from './SaveIcon.vue'
export { default as PrintIcon } from './PrintIcon.vue'
export { default as PdfIcon } from './PdfIcon.vue'

export { default as HeaderIcon } from './HeaderIcon.vue'
export { default as OrderNoIcon } from './OrderNoIcon.vue'
export { default as CustomerIcon } from './CustomerIcon.vue'
export { default as DateIcon } from './DateIcon.vue'
export { default as AmountIcon } from './AmountIcon.vue'
export { default as SignerIcon } from './SignerIcon.vue'
export { default as TextAreaIcon } from './TextAreaIcon.vue'

import TextIcon from './TextIcon.vue'
import ImageIcon from './ImageIcon.vue'
import TableIcon from './TableIcon.vue'
import BarcodeIcon from './BarcodeIcon.vue'
import QrcodeIcon from './QrcodeIcon.vue'
import LineIcon from './LineIcon.vue'
import VLineIcon from './VLineIcon.vue'
import RectIcon from './RectIcon.vue'
import OvalIcon from './OvalIcon.vue'
import HeaderIcon from './HeaderIcon.vue'
import OrderNoIcon from './OrderNoIcon.vue'
import CustomerIcon from './CustomerIcon.vue'
import DateIcon from './DateIcon.vue'
import AmountIcon from './AmountIcon.vue'
import SignerIcon from './SignerIcon.vue'
import TextAreaIcon from './TextAreaIcon.vue'
import type { Component } from 'vue'

export const elementIcons: Record<string, Component> = {
  text: TextIcon,
  image: ImageIcon,
  table: TableIcon,
  barcode: BarcodeIcon,
  qrcode: QrcodeIcon,
  hline: LineIcon,
  vline: VLineIcon,
  rect: RectIcon,
  oval: OvalIcon,
  longText: TextAreaIcon,
  // Business component icons (by tid)
  'customModule.header': HeaderIcon,
  'customModule.orderNo': OrderNoIcon,
  'customModule.customerName': CustomerIcon,
  'customModule.date': DateIcon,
  'customModule.amount': AmountIcon,
  'customModule.barcode': BarcodeIcon,
  'customModule.qrcode': QrcodeIcon,
  'customModule.table': TableIcon,
  'customModule.signer': SignerIcon,
}
