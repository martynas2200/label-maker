import { ref, nextTick } from "vue";
import type { Ref, ComputedRef } from "vue";
import { useScannerEvents } from "./useScannerEvents";
import { resolveBarcodeScan, type ScanResult } from "../services/scanner";
import { toast } from "../helpers/toast";
import { useI18n } from "vue-i18n";

export interface UseBarcodeScannerOptions {
  // When true, subscribes to websocket barcode events.
  active?: Ref<boolean> | ComputedRef<boolean>;
  onItem: (result: ScanResult) => void | Promise<void>;
  onInventoryCommand?: (barcode: string) => void | Promise<void>;
  focusAfterScan?: () => void | Promise<void>;
}

// Shared barcode-scanning logic for items
export function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const { onItem, onInventoryCommand, active = ref(true), focusAfterScan } = options;
  const { t } = useI18n();
  const barcode = ref("");
	const barcodeInputRef = ref<{ focus: () => void } | null>(null);
  useScannerEvents(active, (code) => processBarcode(code));

  async function focusInput() {
    await nextTick();
    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus();
    }
  }

  async function processBarcode(code: string) {
    const barcodeValue = (code || "").trim();
    if (!barcodeValue) return;

    try {
      const inventoryMatch = barcodeValue.match(/^Inventory:\s*(.+)$/i);
      if (inventoryMatch && onInventoryCommand) {
        await onInventoryCommand(inventoryMatch[1].trim());
        return;
      }

      const scanResult = await resolveBarcodeScan(barcodeValue);
      if (!scanResult) {
        toast({
          title: t("item_not_found"),
          text: barcodeValue,
          variant: "warning",
          timeout: 5
        });
        return;
      }
      await onItem(scanResult);
    } catch (e) {
      toast({
        title: t("error"),
        text: e instanceof Error ? e.message : String(e),
        variant: "error",
        timeout: 10
      });
    } finally {
      barcode.value = "";
      await (focusAfterScan ?? focusInput)();
    }
  }

  return { barcode, barcodeInputRef, focusInput, processBarcode };
}
