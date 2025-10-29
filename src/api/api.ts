/**
 * Global Frappe instance interface
 */
declare global {
  interface Window {
    frappe: {
      csrf_token: string
      [key: string]: any
    }
  }
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
}

/**
 * Special parameters that should be JSON-stringified in query strings
 */
const JSON_PARAMS = new Set(['filters', 'fieldname', 'fields'])

/**
 * Converts parameters to URL query string
 */
function serializeQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return

    if (JSON_PARAMS.has(key) && (Array.isArray(value) || typeof value === 'object')) {
      searchParams.append(key, JSON.stringify(value))
    } else if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, String(v)))
    } else if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value))
    } else {
      searchParams.append(key, String(value))
    }
  })

  return searchParams.toString()
}

/**
 * Normalizes URL for method calls vs resource access
 */
function normalizeUrl(url: string, isMethod: boolean = false): string {
  if (url.startsWith('/')) return url
  return isMethod ? `/api/method/${url}` : `/api/resource/${url}`
}

/**
 * Internal request handler
 */
async function request(opts: RequestOptions, isMethod: boolean = false): Promise<any> {
  const url = normalizeUrl(opts.url, isMethod)
  const method = opts.method ?? 'POST'

  let finalUrl = url
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': window.frappe?.csrf_token || '',
    },
  }

  if (method === 'GET' && opts.data) {
    finalUrl = `${url}?${serializeQueryParams(opts.data)}`
  } else if (opts.data) {
    requestInit.body = JSON.stringify(opts.data)
  }

  const response = await fetch(finalUrl, requestInit)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  // Check for Frappe server messages (errors)
  if (data._server_messages) {
    try {
      const messages = JSON.parse(data._server_messages)
      const errorMessages = messages
        .map((msg: string) => {
          try {
            const parsed = JSON.parse(msg)
            return parsed.message || parsed.title || msg
          } catch {
            return msg
          }
        })
        .filter(Boolean)

      if (errorMessages.length > 0) {
        throw new Error(errorMessages.join('; '))
      }
    } catch (e) {
      // If it's already an Error we threw, re-throw it
      if (e instanceof Error && e.message !== data._server_messages) {
        throw e
      }
      // Otherwise throw a generic error with the raw message
      throw new Error('Server error: ' + data._server_messages)
    }
  }

  return data?.message ?? data
}

/**
 * Frappe API client
 */
export function getApi() {
  return {
    call: (methodName: string, args?: Record<string, any>) =>
      request({ url: methodName, method: 'POST', data: args }, true),

    getList: (doctype: string, params?: Record<string, any>) =>
      request({ url: encodeURIComponent(doctype), method: 'GET', data: params }).then(r =>
        Array.isArray(r) ? r : r?.data ?? []
      ),

    getDoc: (doctype: string, name: string, fields?: string[]) =>
      request({
        url: `${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        method: 'GET',
        data: fields ? { fields } : undefined
      }),
  }
}

export type Api = ReturnType<typeof getApi>
