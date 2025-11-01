import { getApi } from './api'

export type AppSettings = {
  default_label_type?: string
  ws_address?: string
  tts_api_key?: string
  package_item?: string
  package_item_text?: string
  deposit_item_text?: string
  deposit_item_price?: number
}

/**
 * Simple settings service wrapper for Python backend API
 * All business logic is in settings.py
 */
export function getSettingsService() {
  const api = getApi()

  return {
    get: () => api.call('label_maker.api.settings.get_settings'),
    set: (settings: Partial<AppSettings>) => api.call('label_maker.api.settings.set_settings', { settings }),
  }
}

export type SettingsService = ReturnType<typeof getSettingsService>
