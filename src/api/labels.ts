// import { getApi } from './api'

/**
 * Wrapper for Python backend API
 * Logic is in labels.py
 */
export function getLabelService() {
  // const api = getApi()

  return {
    printLabels: (itemCodes: string[], labelType: string) => {
      throw new Error('Not implemented yet')
      // return api.call('label_maker.api.print_labels', { item_codes: itemCodes, label_type: labelType })
    },

    printPackagedLabel: (payload: {
      item_code: string
      label_type: string
      weight_g: number
      expiry_date?: string
      add_manufacturer?: boolean
      add_package_fee?: boolean
    }) => {
      throw new Error('Not implemented yet')
      // return api.call('label_maker.api.print_weight_label', payload)
    },
  }
}

export type LabelService = ReturnType<typeof getLabelService>
