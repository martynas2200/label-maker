import { io, type Socket } from 'socket.io-client'
import mitt from 'mitt'
import { getApi } from './api'
import { toast } from '../helpers/toast'

const ITEM_AUDIO_EVENT = 'label_maker_item_audio'
const MSGPRINT_EVENT = 'msgprint'

export type ItemAudioMessage = {
  request_id: string
  audioContent: string
}

type RealtimeEvents = {
  itemAudio: ItemAudioMessage
}

type MsgprintMessage = {
  message?: string
  title?: string
  indicator?: string
}

const emitter = mitt<RealtimeEvents>()
let socket: Socket | null = null
let expectedItemAudioRequestId: string | null = null

export function expectItemAudio(requestId: string | null | undefined) {
  expectedItemAudioRequestId = requestId ?? null
}

export async function connectFrappeRealtime() {
  if (socket) return emitter

  const config = await getApi().call('label_maker.api.runtime.get_realtime_config')

  if (!config?.site || config.disable_async) {
    console.warn('Frappe realtime is disabled.')
    return emitter
  }

  socket = io(`${getSocketOrigin(config.socketio_port, config.dev_server)}/${config.site}`, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 3,
  })

  socket.on(ITEM_AUDIO_EVENT, (message: ItemAudioMessage) => {
    if (!message?.audioContent || !message.request_id) return
    if (expectedItemAudioRequestId !== message.request_id) {
      console.warn('Out of order audio for a different request. Ignoring.')
      return
    }

    expectedItemAudioRequestId = null
    void playAudio(message.audioContent)
    emitter.emit('itemAudio', message)
  })

  // For future surprises ;)
  socket.on("audio", (message: string) => {
    void playAudio(message)
  })

  socket.on(MSGPRINT_EVENT, (message: MsgprintMessage | string) => {
    showMessage(message)
  })

  socket.on('connect_error', (error) => {
    console.error('Frappe realtime connection failed:', error.message)
  })

  return emitter
}

async function playAudio(audioContent: string) {
  try {
    await new Audio(`data:audio/mp3;base64,${audioContent}`).play()
  } catch (error) {
    console.error('Realtime audio playback failed:', error)
  }
}

function showMessage(message: MsgprintMessage | string) {
  const payload = typeof message === 'string' ? { message } : message
  const text = payload?.message
  if (!text) return

  toast({
    title: payload.title,
    text,
    variant: getToastVariant(payload.indicator),
  })
}

function getToastVariant(indicator?: string) {
  if (indicator === 'green') return 'success' as const
  if (indicator === 'orange') return 'warning' as const
  if (indicator === 'red') return 'error' as const
  return 'info' as const
}

function getSocketOrigin(port = 9000, devServer = false) {
  const origin = window.location.origin

  if (!import.meta.env.DEV && !devServer) {
    return origin
  }

  const url = new URL(origin)
  url.port = String(port)
  return url.origin
}

export function onItemAudio(
  callback: (message: ItemAudioMessage) => void,
) {
  emitter.on('itemAudio', callback)

  return () => {
    emitter.off('itemAudio', callback)
  }
}

export function disconnectFrappeRealtime() {
  socket?.disconnect()
  socket = null
}
