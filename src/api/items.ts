import { getApi } from './api'

export type SpeechType = 'quantity' | 'price'
/**
 * Wrapper for Python backend API
 * Logic is in items.py
 */
export function getItemService() {
  const api = getApi()

  return {
    getItem: (codeOrBarcode: string, language?: string, speechType?: SpeechType) =>
      api.call('label_maker.api.items.get_item', {
        code_or_barcode: codeOrBarcode,
        language,
        speech_type: speechType,
      }),

    getRecentlyModifiedItems: (forceRefresh = false) =>
      api.call('label_maker.api.items.get_recently_modified_items', {
        force_refresh: forceRefresh,
        limit: 50
      }),

    getItemsByItemCodes: (itemCodes: string[]) =>
      api.call('label_maker.api.items.get_items_by_codes', { item_codes: itemCodes }),
  }
}

export type ItemService = ReturnType<typeof getItemService>

