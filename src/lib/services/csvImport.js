import api from '@/lib/api'

export function importHistoryFetcher(endpoint) {
  return async ({ start, length, search }) => {
    const params = { start, length, search, draw: 1 }
    const { data } = await api.get(endpoint, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export function postImport(endpoint, payload) {
  return api.post(endpoint, payload)
}

export function putImport(endpoint, payload) {
  return api.put(endpoint, payload)
}
