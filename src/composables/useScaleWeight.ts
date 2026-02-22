import { ref, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { getWebSocketService } from '../api/websocket'

/**
 * Subscribes to scale weight events from the WebSocket service while `active` is true.
 */
export function useScaleWeight(active: Ref<boolean> | ComputedRef<boolean>) {
  const scaleWeight = ref<number | null>(null)
  const { emitter } = getWebSocketService()

  function onWeight(weight: number) {
    scaleWeight.value = weight
  }

  watch(
    active,
    (isActive) => {
      if (isActive) {
        scaleWeight.value = null
        emitter.on('weight', onWeight)
      } else {
        emitter.off('weight', onWeight)
      }
    },
    { immediate: true }
  )

  return { scaleWeight }
}
