import { reactive } from 'vue'

type OnBarcode = (code: string) => void
type OnStatus = (status: string) => void

const state = reactive({
  connected: false,
  url: '',
  last: '',
  scannerActive: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10
})
let ws: WebSocket | null = null
let handler: OnBarcode | null = null
let statusHandler: OnStatus | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let inactiveTimer: ReturnType<typeof setTimeout> | null = null
let shouldReconnect = false
let windowListenersAttached = false

function connect(url: string, onBarcode: OnBarcode, onStatus?: OnStatus) {
  disconnect()
  handler = onBarcode
  statusHandler = onStatus || null
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
    console.log('WebSocket connected')
    // Send ACTIVE if window is focused
    if (document.hasFocus()) {
      sendCommand('ACTIVE')
    }
  })

  ws.addEventListener('close', () => {
    state.connected = false
    state.scannerActive = false
    ws = null
    console.log('WebSocket closed')
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
        handler && handler(code)
      }
    } else if (message.startsWith('STATUS:')) {
      const status = message.substring(7) // Remove "STATUS:" prefix
      handleStatus(status)
    } else {
      // Backward compatibility: treat non-prefixed messages as barcodes
      state.last = message
      handler && handler(message)
    }
  })
}

function handleStatus(status: string) {
  console.log('Scanner status:', status)

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
      console.log('Barcode forwarded to POS')
      break
    case 'UNKNOWN_COMMAND':
      console.warn('Unknown command sent to scanner service')
      break
  }

  statusHandler && statusHandler(status)
}

function scheduleReconnect(immediate = false) {
  if (!shouldReconnect || !state.url) return

  // Stop reconnecting after max attempts
  if (state.reconnectAttempts >= state.maxReconnectAttempts) {
    console.log('Max reconnection attempts reached. Manual reconnect required.')
    shouldReconnect = false
    return
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  if (immediate) {
    state.reconnectAttempts++
    console.log(`Attempting to reconnect (${state.reconnectAttempts}/${state.maxReconnectAttempts})...`)
    return attemptConnect()
  }

  console.log('Scheduling reconnect in 10 seconds...')
  reconnectTimer = setTimeout(() => {
    state.reconnectAttempts++
    console.log(`Attempting to reconnect (${state.reconnectAttempts}/${state.maxReconnectAttempts})...`)
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
  } else {
    console.warn('Cannot send command: WebSocket not connected')
  }
}

function handleWindowFocus() {
  console.log('Window focused - sending ACTIVE')
  sendCommand('ACTIVE')
}

function handleWindowBlur() {
  console.log('Window blurred - scheduling INACTIVE')
  sendCommand('INACTIVE')
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    console.log('Visibility hidden - sending INACTIVE')
    sendCommand('INACTIVE')
  } else if (document.visibilityState === 'visible') {
    console.log('Visibility visible - sending ACTIVE')
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

  console.log('Window focus/blur listeners attached')
}

function removeWindowListeners() {
  if (!windowListenersAttached) return

  window.removeEventListener('focus', handleWindowFocus)
  window.removeEventListener('blur', handleWindowBlur)
  window.removeEventListener('beforeunload', handleWindowBlur)
  window.removeEventListener('pagehide', handleWindowBlur)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  windowListenersAttached = false

  console.log('Window focus/blur listeners removed')
}

function manualReconnect() {
  console.log('Manual reconnect requested')
  state.reconnectAttempts = 0
  shouldReconnect = true
  attemptConnect()
}

export function getScannerService() {
  return { state, connect, disconnect, sendCommand, manualReconnect }
}

export type ScannerService = ReturnType<typeof getScannerService>
