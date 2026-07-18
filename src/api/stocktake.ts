import { getApi } from './api'

export interface StockCheckRecord {
  name: string
  item_code: string
  item_name: string
  barcode: string
  system_qty: number
  actual_qty: number
  difference: number
  checked_by: string
  checked_at: string
}

export function getStockTakeService() {
  const api = getApi()

  return {
    saveCheck: (item_code: string, actual_qty: number, params?: {
      item_name?: string
      barcode?: string
      system_qty?: number
    }) =>
      api.call('label_maker.api.stocktake.save_stock_check', {
        item_code,
        actual_qty,
        ...(params?.item_name ? { item_name: params.item_name } : {}),
        ...(params?.barcode ? { barcode: params.barcode } : {}),
        ...(params?.system_qty !== undefined ? { system_qty: params.system_qty } : {}),
      }),

    getLastCheck: (itemCode: string) =>
      api.call('label_maker.api.stocktake.get_last_check', { item_code: itemCode }),

    getRecentChecks: (limit = 50) =>
      api.call('label_maker.api.stocktake.get_recent_checks', { limit }),
  }
}

export type StockTakeService = ReturnType<typeof getStockTakeService>
