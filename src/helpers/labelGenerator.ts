

import { type Item, type PackagedItem} from '../types'
import { Code128, getDataMatrixMat, toPath } from './barcodeGenerator'

export type LabelType = 'normal' | 'half' | 'fridge' | 'barcodeOnly'

function i18n(key: string): string {
  return key
}

/**
 * Ensures an item has the getBarcode() method
 */
function ensureGetBarcode(item: any): Item {
  if (!item.getBarcode) {
    item.getBarcode = function() {
      return this.barcodes && this.barcodes.length > 0 ? this.barcodes[0] : null
    }
  }
  return item as Item
}

export class LabelGenerator {
  items: Item[] = []
  success: boolean = false
  readonly type: LabelType

  constructor(
    data:
      | Item[]
      | Promise<Item[]>
      | PackagedItem[]
      | Promise<PackagedItem[]>
      | undefined = undefined,
    type: LabelType = 'normal',
  ) {
    this.type = type
    if (data == null) {
      // The constructor was called without data.
    } else if (data instanceof Promise) {
      void data.then((data) => {
        this.items = data.map(ensureGetBarcode)
        this.print()
      })
    } else {
      this.items = data.map(ensureGetBarcode)
      this.print()
    }
  }

  print(): void {
    this.items = this.items.filter((item) => item.barcodes.length > 0)
    if (!this.isAllItemsActive()) {
      if (!confirm(i18n('notAllItemsActive'))) {
        return
      }
    }
    if (this.type == 'half' && this.items.length % 2 != 0) {
      if (!confirm(i18n('oddNumberOfItems'))) {
        return
      }
    }

    if (this.items.length > 0) {
      void this.printLabelsUsingBrowser(this.items)
    } else {
      alert(i18n('noData'))
    }
  }

  isAllItemsActive(): boolean {
    return this.items.every((item) => item.disabled !== true)
  }

  makeUpperCaseBold(text: string): string {
    const regex = /("[^"]+"|[A-ZŽĄČĘĖĮŠŲŪ]{3,})/g
    return text.replace(regex, '<b>$1</b>')
  }

  static getPricePerUnit(item: Item): string | null {
    const regex =
      /(?:,?\s*)?(?:(\d+)\s*x\s*)?(\d+(\.\d+)?(?:,\d+)?)[\s]*(k?g|m?l|vnt|pak|rul)\b/i
    const match = item.item_name.match(regex)

    if (match) {
      // if match is found, double check if there is another number in the string by removing the first match
      const match2 = item.item_name.replace(match[0], '').match(regex)
      if (match2) {
        return null
      }

      const multiplier = match[1] ? parseInt(match[1]) : 1 // Multiplier if "4 x" pattern exists
      const amount = parseFloat(match[2].replace(',', '.')) * multiplier // Total amount
      const unit = match[4].replace('.', '').toLowerCase() // Normalize unit
      let pricePerUnit

      if (unit === 'g' || unit === 'ml') {
        pricePerUnit =
          (item.standard_rate / (amount / 1000)).toFixed(2) +
          (unit === 'ml' ? ' €/l' : ' €/kg')
      } else {
        pricePerUnit = (item.standard_rate / amount).toFixed(2) + ' €/' + unit
      }
      if (parseFloat(pricePerUnit) === item.standard_rate) {
        return null
      }
      return pricePerUnit
    }
    return null
  }

  generateLabel(
    data: PackagedItem,
    type: LabelType = this.type,
  ): HTMLDivElement {
    const label = document.createElement('div')
    label.className = 'label'
    if (data.weight != null) {
      return this.generateWeightLabel(data, type === 'half')
    } else if (type !== 'normal') {
      label.classList.add(type)
    }

    label.appendChild(
      this.createDivWithClass('item', this.makeUpperCaseBold(data.item_name), true),
    )

    const barcode = data.getBarcode()
    if (barcode != null && type !== 'half') {
      label.appendChild(this.createCode123Div(data))
    } else if (barcode != null) {
      label.appendChild(this.createDMDiv(barcode))
    }

    label.appendChild(this.createDivWithClass('price', this.getItemPrice(data)))

    // TODO: NEEDS TO BE A PART OF SETTINGS
    if (data.deposit_package_count != null && data.deposit_package_count > 0) {
      const packagePrice = 0.1 * data.deposit_package_count
      label.appendChild(
        this.createDivWithClass('subtext', 'Tara +' + packagePrice.toFixed(2)),
      )
      } else if (typeof data.stock_uom === 'string' && data.stock_uom.toLowerCase().includes('kg')) {  label.appendChild(
        this.createDivWithClass('subtext', '/ 1 ' + data.stock_uom),
      )
    }

    return label
  }

  getItemPrice(data: Item): string {
    if (data.standard_rate == null || data.standard_rate === 0) {
      return ''
    }
    if (typeof data.standard_rate === 'number') {
      return data.standard_rate.toFixed(2)
    } else {
      return parseFloat(data.standard_rate).toFixed(2).toString()
    }
  }

  createCode123Div(data: Item): HTMLDivElement {
    const barcode = document.createElement('div')
    barcode.className = 'barcode'

    const barcodeStr = data.getBarcode()
    if (!barcodeStr) {
      return barcode
    }

    barcode.appendChild(this.createDivWithClass('barcode-text', barcodeStr))

    const code128 = new Code128(barcodeStr)
    const p = document.createElement('p')
    p.innerHTML = code128.toHtml(
      code128.encode(),
      this.type == 'barcodeOnly' ? [1, 50] : [1, 15],
    )
    barcode.appendChild(p)
    return barcode
  }
  generateWeightLabel(data: PackagedItem, half = false): HTMLDivElement {
    const label = document.createElement('div')

    const barcode = data.getBarcode()
    if (
      data.weight == null ||
      data.total_price == null ||
      data.standard_rate == null ||
      barcode == null ||
      barcode.length > 13
    ) {
      return label
    }
    label.className = 'label weight' + (half ? ' half' : '')

    const elements = [
      { className: 'item', text: data.item_name },
      {
        className: 'price',
        text:
          half && data.add_package_fee
            ? (data.total_price + 0.01).toFixed(2)
            : data.total_price.toFixed(2),
      },
      {
        className: 'weight',
        text:
          (typeof data.stock_uom === 'string' && data.stock_uom.toLowerCase().includes('kg')
            ? Number(data.weight).toFixed(3)
            : data.weight.toString()) +
          (half ? ' ' + data.stock_uom : ''),
      },
      {
        className: 'kg-price',
        text: data.standard_rate.toFixed(2) + (half ? ' €/kg' : ''),
      },
      { className: 'weight-text', text: data.stock_uom },
      { className: 'kg-text', text: '€/' + data.stock_uom },
    ]
    // TODO: use the settings to determine if package fee is added
    // TODO: add a setting for package fee text
    if (data.add_package_fee && !half) {
      elements.push({ className: 'package', text: '+ 0,01 (fas. maišelis)' })
    }
    elements.forEach(({ className, text }) => {
      label.appendChild(this.createDivWithClass(className, text))
    })

    const barcodeString =
      (data.add_package_fee ? '1102\t1\n' : '') +
      this.createPackedItemBarcode(data) +
      '\t1\n\r'
    label.appendChild(this.createDMDiv(barcodeString))

    if (data.expiry_date != null) {
      const date: string = new Date(data.expiry_date).toLocaleDateString(
        'lt-LT',
        {
          month: '2-digit',
          day: '2-digit',
        },
      )
      label.appendChild(this.createDivWithClass('expiry', date))
    }

    if (data.add_manufacturer == true && data.default_item_manufacturer != null) {
      label.appendChild(
        this.createDivWithClass('manufacturer', data.default_item_manufacturer),
      )
    }

    return label
  }

  createDivWithClass(
    className: string,
    text: string,
    raw = false,
  ): HTMLDivElement {
    const div = document.createElement('div')
    div.className = className
    if (raw) {
      div.innerHTML = text
    } else {
      div.textContent = text
    }
    return div
  }

  createPackageBarcode(items: Item[] | PackagedItem[]): string {
    if (items.length < 1) {
      throw new Error('No items to create package barcode')
    }
    // { barcode + tab + quantity + line feed } for each item
    // and a final \r
    let barcodeString = ''
    items.forEach((item) => {
      const barcode = item.getBarcode()
      if (barcode == null) {
        throw new Error('Item has no barcode')
      }
      // Check if it's a PackagedItem (has weight property)
      const quantity = 'weight' in item && item.weight != null ? item.weight : 1
      barcodeString += `${barcode}\t${quantity}\n`
    })
    barcodeString += '\r' // carriage return at the end
    return barcodeString
  }

  createPackedItemBarcode(data: PackagedItem): string {
    const barcode = data.getBarcode()
    if (barcode == null || data.weight == null) {
      throw new Error('Item has no barcode or weight')
    }
    // Prefix 2200, then 13 digits of barcode, then 4 digits of weight
    const weight = typeof data.weight === 'number' ? data.weight : parseFloat(data.weight)
    return (
      '2200' +
      barcode.padStart(13, '0') +
      weight.toFixed(3).replace('.', '').padStart(4, '0')
    )
  }
  /**
   * Create a Data Matrix barcode as a div element
   * @param barcodeString The barcode string to encode
   * @param big If true, the barcode will be larger (default: false)
   * @returns HTMLDivElement containing the Data Matrix barcode
   */
  createDMDiv(barcodeString: string, big = false): HTMLDivElement {
    if (typeof barcodeString !== 'string') {
      throw new Error('Barcode string must be a string')
    } else if (barcodeString.length < 1) {
      throw new Error('Barcode string cannot be empty')
    }
    const barcode = document.createElement('div')
    barcode.className = 'barcode dm'

    const svgNS = 'http://www.w3.org/2000/svg'
    const svg: SVGSVGElement = document.createElementNS(svgNS, 'svg')
    const path = document.createElementNS(svgNS, 'path')

    // Get the actual DataMatrix pattern
    const matrix = getDataMatrixMat(barcodeString)
    const actualSize = matrix.length
    path.setAttribute('transform', 'scale(1)')
    path.setAttribute('d', toPath(matrix))
    svg.appendChild(path)
    svg.setAttribute('class', 'datamatrix')
    // Set viewBox to exactly match the matrix dimensions with small padding
    svg.setAttribute('viewBox', `0 0 ${actualSize} ${actualSize}`)
    // TODO: not sure about max constraints
    if (big === true) {
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.maxWidth = '60px'
      svg.style.maxHeight = '60px'
    } else {
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.maxWidth = '30px'
      svg.style.maxHeight = '30px'
    }
    // Ensure crisp edges for barcode
    svg.style.imageRendering = 'pixelated'
    svg.style.shapeRendering = 'crispEdges'
    barcode.appendChild(svg)
    return barcode
  }

  isItInAppMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches
    )
  }

  async printLabelsUsingBrowser(data: Item[]): Promise<void> {
    const labels: HTMLElement[] = data.map((item) => this.generateLabel(item))

    const popup: Window | null = window.open(
      '',
      '_blank',
      this.isItInAppMode() ? 'width=250,height=300' : 'width=800,height=600',
    )
    if (popup == null) {
      alert('Please allow popups for this site')
      return
    }
    popup.document.title = `${labels.length} ${i18n('nlabelsToBePrinted')}`
    popup.document.head.appendChild(this.createStyleElement())

    labels.forEach((label) => {
      popup.document.body.appendChild(label)
    })

    this.success = true

    popup.addEventListener('afterprint', () => {
      popup.close()
    })
    popup.print()
  }

  createStyleElement(): HTMLStyleElement {
    const style: HTMLStyleElement = document.createElement('style')
    style.innerHTML = `
@media print {
  body {
    margin: 0;
    padding: 0;
    max-width: 58.3mm;
    display: inline-flex;
    flex-wrap: wrap;
  }
}

.label {
  all: revert;
  position: relative;
  background: white;
  color: black;
  height: 31.75mm;
  width: 57.15mm;
  border: 0.5px solid #ffdfd4;
  margin: 0px;
  box-sizing: border-box;
  overflow: hidden;
}

.item {
  height: 19mm;
  overflow: hidden;
  padding: 4px;
  font-family: Arial, sans-serif;
  font-size: initial;
  line-height: initial;
}

.barcode {
  white-space: nowrap;
  position: absolute;
  bottom: 0;
  z-index: 3;
}

.barcode div {
  font-size: 10px;
  font-family: monospace;
  margin-left: 6px;
  line-height: 1em;
}

.barcode p {
  margin: 0;
}

.dm {
  width: 6mm;
  height: 6mm;
  transform: rotate(270deg);
  padding: 3px;
  fill: black;
}

.subtext {
  position: absolute;
  right: 2px;
  bottom: 3px;
  font-family: serif;
  font-size: 18px;
  font-weight: 500;
  z-index: 10;
  line-height: 1em;
}

.price {
  position: absolute;
  bottom: 21px;
  font-size: 50px;
  right: 0;
  overflow: hidden;
  object-position: center;
  margin-right: 3px;
  line-height: 1em;
  font-family: "Book Antiqua", serif;
  padding: 0px 10px;
}

.price-per-unit {
  color: #777;
}

.barcodeOnly .item {
  font-size: 0.9em;
  margin-right: 15px;
}

.barcodeOnly .barcode {
  left: 50%;
  transform: translateX(-50%) scale(1.4);
  width: max-content;
}

.barcodeOnly .barcode>div {
  margin-left: 0;
  font-size: 8px;
  writing-mode: vertical-lr;
  position: absolute;
  right: -1.2em;
  bottom: 1.2em;
}

.barcodeOnly .price,
.barcodeOnly .price-per-unit,
.barcodeOnly .subtext {
  display: none;
}

.label.fridge::before {
  content: "";
  display: block;
  position: absolute;
  border-top: 0.5px dashed #ff9b79;
  width: 100%;
  bottom: 7mm;
}

.label.fridge .item {
  font-size: 15px;
  height: 12mm;
}

.label.fridge .barcode p,
.label.fridge .price-per-unit {
  display: none;
}

.label.fridge .subtext {
  font-family: "Book Antiqua", serif;
  font-size: 1em;
  bottom: 11mm;
  left: 0;
  right: unset;
  background: #888;
  color: white;
  padding: 0px 3px;
  margin-left: 6px;
  border-radius: 3px;
  padding-top: 2px;
}

.label.fridge .price,
.label.fridge .barcode {
  bottom: 8mm;
  line-height: 0.9em;
}

.label.half {
  width: calc(57.15mm / 2);
  display: block;
  border-right: 0.5px dashed #ff9b79;
}

.label.half+.label.half:nth-of-type(even) {
  border-right-style: solid;
  border-left-style: none;
}

.label.half .item {
  font-size: 0.75em;
  font-size: 12px;
  text-align: center;
}

.label.half .subtext {
  padding: 0px 3px;
  border-radius: 3px;
  font-size: 0.95em;
}

.label.half .price {
  right: 0;
  left: 0;
  margin: 0px 3px;
  padding: 0px;
  text-align: center;
  font-size: 38px;
}

.label.half .barcode.dm {
  transform: none;
  bottom: 1;
}

.label.half .barcode p {
  display: none;
}

.label.weight {
  display: grid;
  grid-template-columns: min-content 1fr;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  box-sizing: border-box;
  writing-mode: vertical-rl;
  grid-column-gap: 2px;
  grid-row-gap: 0px;
  font-family: "Arial";
}

.label.weight .barcode {
  grid-column: 1;
  position: static;
  width: 8mm;
  height: 8mm;
  transform: unset;
}

.label.weight .item {
  grid-column: span 2;
  text-align: left;
  font-size: 11pt;
  font-size: 10pt;
  max-width: 60pt;
  padding: 0px;
  height: unset;
}

.label.weight .price {
  all: revert;
  grid-row: 2;
  grid-column: span 2;
  text-align: center;
  justify-self: center;
  align-self: end;
  font-size: 16pt;
  font-weight: bold;
  line-height: 1em;
  font-family: "Book Antiqua", serif;
  margin-right: 4px;
}

.label.weight .price::after {
  content: "  €";
}

.label.weight .kg-price {
  grid-column: 2;
  justify-self: center;
  align-self: end;
}

.label.weight .kg-text {
  grid-column: 2;
}

.label.weight .kg-text,
.label.weight .weight-text {
  justify-self: center;
  align-self: baseline;
  color: #999;
  font-size: 0.8em;
  line-height: 0.6;
}

.label.weight .weight-text {
  grid-column: 1;
}

.label.weight .weight {
  grid-column: 1;
  justify-self: center;
  align-self: end;
}

.label.weight .expiry {
  grid-column: 2;
  text-align: center;
  justify-self: center;
  align-self: center;
  line-height: 0.9;
  font-size: 0.8em;
  color: black;
}

.label.weight .expiry::before {
  content: "Geriausia iki ";
  color: #444;
  display: inline;
  font-family: Arial;
}

.label.weight.half {
  display: grid;
  writing-mode: unset;
}

.label.weight.half .price {
  font-size: 18px;
}

.label.weight.half *:not(.price) {
  font-size: 9pt;
}

.label.weight.half .item {
  max-width: unset;
  max-height: 11mm;
}

.label.weight.half .dm {
  grid-row: 3 / span 3;
}

.label.weight.half .weight {
  grid-column: 2;
}

.label.weight.half .expiry::before {
  content: " ";
  display: inline-block;
  position: static;
  background-repeat: no-repeat;
  background-image: url("data:image/svg+xml,%3Csvg fill='%23000000' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='15px' height='15px' viewBox='0 0 612 612' xml:space='preserve'%3E%3Cg%3E%3Cg%3E%3Cpath d='M612,463.781c0-70.342-49.018-129.199-114.75-144.379c-10.763-2.482-21.951-3.84-33.469-3.84 c-3.218,0-6.397,0.139-9.562,0.34c-71.829,4.58-129.725,60.291-137.69,131.145c-0.617,5.494-0.966,11.073-0.966,16.734 c0,10.662,1.152,21.052,3.289,31.078C333.139,561.792,392.584,612,463.781,612C545.641,612,612,545.641,612,463.781z M463.781,561.797c-54.133,0-98.016-43.883-98.016-98.016s43.883-98.016,98.016-98.016s98.016,43.883,98.016,98.016 S517.914,561.797,463.781,561.797z'/%3E%3Cpolygon points='482.906,396.844 449.438,396.844 449.438,449.438 396.844,449.438 396.844,482.906 482.906,482.906 482.906,449.438 482.906,449.438 '/%3E%3Cpath d='M109.969,0c-9.228,0-16.734,7.507-16.734,16.734v38.25v40.641c0,9.228,7.506,16.734,16.734,16.734h14.344 c9.228,0,16.734-7.507,16.734-16.734V54.984v-38.25C141.047,7.507,133.541,0,124.312,0H109.969z'/%3E%3Cpath d='M372.938,0c-9.228,0-16.734,7.507-16.734,16.734v38.25v40.641c0,9.228,7.507,16.734,16.734,16.734h14.344 c9.228,0,16.734-7.507,16.734-16.734V54.984v-38.25C404.016,7.507,396.509,0,387.281,0H372.938z'/%3E%3Cpath d='M38.25,494.859h236.672c-2.333-11.6-3.572-23.586-3.572-35.859c0-4.021,0.177-7.999,0.435-11.953H71.719 c-15.845,0-28.688-12.843-28.688-28.688v-229.5h411.188v88.707c3.165-0.163,6.354-0.253,9.562-0.253 c11.437,0,22.61,1.109,33.469,3.141V93.234c0-21.124-17.126-38.25-38.25-38.25h-31.078v40.641c0,22.41-18.23,40.641-40.641,40.641 h-14.344c-22.41,0-40.641-18.231-40.641-40.641V54.984H164.953v40.641c0,22.41-18.231,40.641-40.641,40.641h-14.344 c-22.41,0-40.641-18.231-40.641-40.641V54.984H38.25C17.126,54.984,0,72.111,0,93.234v363.375 C0,477.733,17.126,494.859,38.25,494.859z'/%3E%3Ccircle cx='134.774' cy='260.578' r='37.954'/%3E%3Ccircle cx='248.625' cy='260.578' r='37.954'/%3E%3Ccircle cx='362.477' cy='260.578' r='37.954'/%3E%3Ccircle cx='248.625' cy='375.328' r='37.953'/%3E%3Ccircle cx='134.774' cy='375.328' r='37.953'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  height: 15px;
  width: 15px;
}

.label.weight.half .expiry {
  display: flex;
  align-items: center;
}

.label.weight.half .manufacturer,
.label.weight.half .weight-text,
.label.weight.half .kg-text,
.label.weight.half .package {
  display: none;
}

.label.weight .manufacturer,
.label.weight .description {
  font-size: 0.7em;
  grid-column: span 2;
}

.label.weight .package {
  font-size: 0.7em;
  grid-column: span 2;
  grid-row: 3;
  grid-column: span 2;
  text-align: center;
  justify-self: center;
  align-self: center;
  margin-right: -5px;
  margin-left: 5px;
  color: #444;
  font-size: 10px;
  line-height: 0.8em;
}

del {
  color: grey;
  position: relative;
  text-decoration: none;
  position: absolute;
  bottom: 0;
  right: 5px;
  font-size: 1.4em;
  line-height: 1em;
}

del:after {
  content: "";
  display: block;
  position: absolute;
  width: 110%;
  height: 2px;
  border-radius: 1px;
  background: darkred;
  top: 9px;
  left: -5%;
  transform: skewY(-14deg);
}
    `
    return style
  }
}
