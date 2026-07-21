import { watch, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { getWebSocketService } from '../api/websocket'

export function useScannerEvents(
  active: Ref<boolean> | ComputedRef<boolean>,
  onBarcode: (code: string) => void,
) {
  const { emitter } = getWebSocketService()

  watch(
    active,
    (isActive) => {
      if (isActive) {
        emitter.on('barcode', onBarcode)
      } else {
        emitter.off('barcode', onBarcode)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    emitter.off('barcode', onBarcode)
  })
}
