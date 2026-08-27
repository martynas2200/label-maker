import { ref, nextTick } from "vue";
import type { Ref, ComputedRef } from "vue";
import { useScannerEvents } from "./useScannerEvents";
import { scanBarcode, type ScanResult } from "../services/scanner";
import { toast } from "../helpers/toast";

export interface UseBarcodeScannerOptions {
  // When true, subscribes to websocket barcode events.
  active?: Ref<boolean> | ComputedRef<boolean>;
  onItem: (result: ScanResult) => void | Promise<void>;
  focusAfterScan?: () => void | Promise<void>;
}

// Shared barcode-scanning logic for items
export function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const { onItem, active = ref(true), focusAfterScan } = options;

  const barcode = ref("");
	const barcodeInputRef = ref<{ focus: () => void } | null>(null);
  useScannerEvents(active, (code) => handleScan(code));

  async function focusInput() {
    await nextTick();
    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus();
    }
  }

  async function handleScan(code: string) {
    const normalized = (code || "").trim();
    if (!normalized) return;

    try {
      const result = await scanBarcode(normalized);
      if (!result) {
        toast({
          title: "Item not found",
          text: `Barcode: ${normalized}`,
          icon: "alert",
          timeout: 5
        });
        return;
      }
      await onItem(result);
    } catch (e) {
      toast({
        title: "Error",
        text: e instanceof Error ? e.message : String(e),
        icon: "x",
        timeout: 10
      });
    } finally {
      barcode.value = "";
      (focusAfterScan ?? focusInput)();
    }
  }

  return { barcode, barcodeInputRef, focusInput, handleScan };
}
