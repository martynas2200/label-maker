import { ref, nextTick } from "vue";
import type { Ref, ComputedRef } from "vue";
import { useScannerEvents } from "./useScannerEvents";
import type { SpeechType } from "../api/items";
import { toast } from "../helpers/toast";
import { useI18n } from "vue-i18n";
import { getItemService, type ItemService } from "../api/items";
import { expectItemAudio } from "../api/frappeRealtime";

export interface UseBarcodeScannerOptions {
  // When true, subscribes to websocket barcode events.
  active?: Ref<boolean> | ComputedRef<boolean>;
  onItem: (result: Record<string, unknown>) => void | Promise<void>;
  onInventoryCommand?: (barcode: string) => void | Promise<void> | null;
  getSpeechRequest?: () => { language: string; speechType: SpeechType } | null;
  focusAfterScan?: () => void | Promise<void>;
}

// Shared barcode-scanning logic for items
export function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const { onItem, onInventoryCommand = null, getSpeechRequest, active = ref(true), focusAfterScan } = options;
  const { t } = useI18n();
  const isProcessing = ref(false);
  const barcode = ref("");
  const itemService: ItemService = getItemService();
	const barcodeInputRef = ref<{ focus: () => void } | null>(null);
  useScannerEvents(active, (code) => processBarcode(code));

  async function focusInput() {
    await nextTick();
    if (barcodeInputRef.value) {
      barcodeInputRef.value.focus();
    }
  }

  async function processBarcode(code: string) {
    let barcodeValue = (code || "").trim();
    if (!barcodeValue || isProcessing.value) return;

    isProcessing.value = true;
    try {
      const inventoryMatch = barcodeValue.match(/^Inventory:\s*(.+)$/i);
      if (inventoryMatch && onInventoryCommand) {
        await onInventoryCommand(inventoryMatch[1].trim());
        return;
      } else if (inventoryMatch) {
        barcodeValue = inventoryMatch[1].trim();
      }

      const speechRequest = getSpeechRequest?.();
      const scanResult = await itemService.getItem(
        barcodeValue,
        speechRequest?.language,
        speechRequest?.speechType,
      );
      expectItemAudio(scanResult?.audio_request_id);
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
      isProcessing.value = false;
      await (focusAfterScan ?? focusInput)();
    }
  }

  return { barcode, barcodeInputRef, focusInput, processBarcode, isProcessing };
}
