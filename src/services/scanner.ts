import { parseBarcode, type ParsedBarcode } from "../helpers/barcodeParser";
import { calculateTotalPrice } from "../helpers/utilities";
import { getItemService, type ItemService } from "../api/items";

export interface ScanResult {
  item: Record<string, unknown>;
  parsed: ParsedBarcode | null;
  isPackaged: boolean;
  packagedWeight: number;
}

export async function scanBarcode(code: string): Promise<ScanResult | null> {
  const trimmed = (code || "").trim();
  if (!trimmed) return null;

  const parsed = parseBarcode(trimmed);
  const itemService: ItemService = getItemService();
  let item: Record<string, unknown> | null = null;

  // Packaged barcode first
  if (parsed?.isPackaged) {
    item = await itemService.getItem(parsed.itemCode);
  }

  // Fallback with raw barcode
  if (!item) {
    item = await itemService.getItem(trimmed);
  }

  if (!item) return null;

  const isPackaged = parsed?.isPackaged ?? false;
  const packagedWeight = isPackaged ? (parsed as ParsedBarcode).weight : 0;

  if (isPackaged) {
    item.weight = packagedWeight;
    item.total_price = calculateTotalPrice(
      item.standard_rate as number,
      packagedWeight,
    );
  }

  return { item, parsed, isPackaged, packagedWeight };
}
