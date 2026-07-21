import api from '@/lib/api'
import { getSession } from '@/lib/auth'

/**
 * SERVICE PEMBAYARAN BULANAN.
 * Endpoint mengikuti SCC:
 * - select-bank
 * - submission/dependent-payment/*
 */

export async function getBankOptions() {
  const { data } = await api.get('select-bank')
  return data?.account_bank || []
}

export async function checkDependentPaymentCode(code) {
  const { data } = await api.get('submission/dependent-payment/check/' + code)
  return data
}

export function storeDependentPayment(payload) {
  return api.post('submission/dependent-payment', payload)
}

export function dependentPaymentFetcher(status = 'paid') {
  return async ({ start, length, search }) => {
    const session = getSession()
    const params = {
      partner_id: session.partnerId,
      start,
      length,
      search,
      draw: 1,
    }
    const { data } = await api.get('submission/dependent-payment/' + status, { params })
    return {
      rows: data?.data || [],
      total: data?.recordsFiltered ?? data?.recordsTotal ?? (data?.data?.length || 0),
    }
  }
}

export async function getDependentPaymentHistory(id) {
  const { data } = await api.get('submission/dependent-payment/history/' + id)
  return data?.data || []
}

export function payDependentPayment(payload) {
  return api.post('submission/dependent-payment/payment', payload)
}
