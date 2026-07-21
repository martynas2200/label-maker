/**
 * Barcode parser for packaged item barcodes.
 *
 * Packaged barcodes follow these formats:
 * - 13-digit (EAN-13): prefix 23, 24 → 8-digit item code + 4-digit weight (grams)
 * - 13-digit (EAN-13): prefix 25, 29 → 7-digit item code + 4-digit weight (grams)
 * - 21-digit:          4-digit prefix + 13-digit item code (left-zero-padded) + 4-digit weight
 */

export interface ParsedBarcode {
  isPackaged: boolean;
  itemCode: string;
  weight: number; // in kg (0 for non-packaged barcodes)
}

export function canBePackagedBarcode(barcode: string): boolean {
  const prefix = parseInt(barcode.slice(0, 2), 10);
  return (barcode.length === 13 || barcode.length === 21) && prefix > 20 && prefix < 30;
}

export function extractBarcodePart(barcode: string): string {
  if (barcode.length === 13 && ["23", "24"].includes(barcode.slice(0, 2))) {
    return barcode.slice(0, 8);
  } else if (barcode.length === 13 && ["25", "29"].includes(barcode.slice(0, 2))) {
    return barcode.slice(0, 7);
  } else if (barcode.length === 21) {
    return barcode.slice(4, 17).replace(/^0+/, "");
  }
  return barcode;
}

export function calculateWeight(barcode: string): number {
  const weightPart = barcode.length > 13 ? barcode.slice(17, 21) : barcode.slice(8, 12);
  return parseInt(weightPart, 10) / 1000;
}

export function parseBarcode(barcode: string): ParsedBarcode | null {
  if (!barcode) return null;

  if (canBePackagedBarcode(barcode)) {
    const itemCode = extractBarcodePart(barcode);
    const weight = calculateWeight(barcode);
    return { isPackaged: true, itemCode, weight };
  }

  return { isPackaged: false, itemCode: barcode, weight: 0 };
}
