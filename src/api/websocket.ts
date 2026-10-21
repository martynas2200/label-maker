import { reactive } from 'vue'
import mitt from 'mitt'

type Events = {
  barcode: string
  status: string
  weight: number
}

const emitter = mitt<Events>()
const state = reactive({
  connected: false,
  url: '',
  last: '',
  scannerActive: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10
})
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let inactiveTimer: ReturnType<typeof setTimeout> | null = null
let shouldReconnect = false
let windowListenersAttached = false

function connect(url: string) {
  disconnect() // Ensure any existing connection is closed before starting a new one
  state.url = url
  shouldReconnect = true
  setupWindowListeners()
  attemptConnect()
}

function attemptConnect() {
  if (!state.url || !shouldReconnect) return

  try {
    ws = new WebSocket(state.url)
  } catch (e) {
    console.error('WebSocket connect error', e)
    state.connected = false
    scheduleReconnect()
    return
  }

  ws.addEventListener('open', () => {
    state.connected = true
    state.reconnectAttempts = 0 // Reset counter on successful connection
    console.debug('WebSocket connected')
    // Send ACTIVE if window is focused
    if (document.hasFocus()) {
      sendCommand('ACTIVE')
    }
  })

  ws.addEventListener('close', () => {
    state.connected = false
    state.scannerActive = false
    ws = null
    console.debug('WebSocket closed')
    scheduleReconnect(true)
  })

  ws.addEventListener('error', (err) => {
    console.error('WebSocket error', err)
    state.connected = false
    state.scannerActive = false
  })

  ws.addEventListener('message', (ev) => {
    const data = String((ev as MessageEvent).data || '')
    const message = data.trim()

    if (!message) return

    if (message.startsWith('BARCODE:')) {
      const code = message.substring(8) // Remove "BARCODE:" prefix
      if (code) {
        state.last = code
        emitter.emit('barcode', code)
      }
    } else if (message.startsWith('STATUS:')) {
      const status = message.substring(7) // Remove "STATUS:" prefix
      handleStatus(status)
    } else if (message.startsWith('WEIGHT:')) {
      const weight = parseFloat(message.substring(7)) // Remove "WEIGHT:" prefix
      if (!isNaN(weight)) {
        emitter.emit('weight', weight)
      }
    } else {
      // Backward compatibility: treat non-prefixed messages as barcodes
      state.last = message
      emitter.emit('barcode', message)
    }
  })
}

function handleStatus(status: string) {
  switch (status) {
    case 'ACTIVE':
      state.scannerActive = true
      break
    case 'INACTIVE':
      state.scannerActive = false
      break
    case 'NOT_CONNECTED':
      // Scanner hardware is disconnected, but we're still connected to WS server
      state.scannerActive = false
      break
    case 'FORWARDED':
      break
    case 'UNKNOWN_COMMAND':
      console.warn('Unknown command sent to scanner service')
      break
  }

  emitter.emit('status', status)
}

function scheduleReconnect(immediate = false) {
  if (!shouldReconnect || !state.url) return

  // Stop reconnecting after max attempts
  if (state.reconnectAttempts >= state.maxReconnectAttempts) {
    console.warn('Max WebSocket reconnection attempts reached. Manual reconnect required.')
    shouldReconnect = false
    return
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  if (immediate) {
    state.reconnectAttempts++
    return attemptConnect()
  }

  reconnectTimer = setTimeout(() => {
    state.reconnectAttempts++
    attemptConnect()
  }, 10000)
}

function disconnect() {
  shouldReconnect = false

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (inactiveTimer) {
    clearTimeout(inactiveTimer)
    inactiveTimer = null
  }

  removeWindowListeners()

  try {
    if (ws) ws.close()
  } catch {}

  ws = null
  state.connected = false
  state.scannerActive = false
  state.reconnectAttempts = 0
}

function sendCommand(command: string) {
  if (ws && state.connected) {
    ws.send(command)
  }
}

function handleWindowFocus() {
  sendCommand('ACTIVE')
}

function handleWindowBlur() {
  sendCommand('INACTIVE')
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    sendCommand('INACTIVE')
  } else if (document.visibilityState === 'visible') {
    sendCommand('ACTIVE')
  }
}

function setupWindowListeners() {
  if (windowListenersAttached) return

  window.addEventListener('focus', handleWindowFocus)
  window.addEventListener('blur', handleWindowBlur)
  window.addEventListener('beforeunload', handleWindowBlur)
  window.addEventListener('pagehide', handleWindowBlur)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  windowListenersAttached = true

}

function removeWindowListeners() {
  if (!windowListenersAttached) return

  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('beforeunload', handleWindowBlur)
  window.removeEventListener('pagehide', handleWindowBlur)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  windowListenersAttached = false

}

function manualReconnect() {
  state.reconnectAttempts = 0
  shouldReconnect = true
  attemptConnect()
}

export function getWebSocketService() {
  return { state, connect, disconnect, sendCommand, manualReconnect, emitter }
}

export type ScannerService = ReturnType<typeof getWebSocketService>
