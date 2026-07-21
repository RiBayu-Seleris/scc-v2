import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'

/**
 * Service dashboard khusus halaman Profil Risiko dan Top 10 Criteria.
 * Endpoint, query key, dan default tanggal mengikuti implementasi ehd-backoffice.
 */

export const DASHBOARD_START_DATE = '2023-01-01'
export const DASHBOARD_END_DATE = '2030-01-01'

function clean(value) {
  return value !== undefined && value !== null && value !== ''
}

/**
 * Scope dasar mengikuti halaman lama:
 * - selalu membawa partner_id dari partnerIdSelected
 * - membawa id role dari auth/data bila tersedia
 */
export async function dashboardScopeParams() {
  const auth = useAuthStore()
  const session = getSession()
  const user = auth.user || (await auth.fetchUser()) || {}
  const params = {
    partner_id: session.partnerId || user.partner_id,
  }

  const scopeKeys = [
    'insurance_company_id',
    'member_id',
    'broker_id',
    'reassurance_id',
    'retrosesi_id',
    'product_id',
  ]
  scopeKeys.forEach((key) => {
    if (clean(user[key])) params[key] = user[key]
  })
  return params
}

export async function getDashboardFilterSelection(partnerId) {
  const { data } = await api.get('dashboard/filter/selection', { params: { partner_id: partnerId } })
  return data?.data || {}
}

export async function getRiskProfile(endpoint, params) {
  const { data } = await api.get(endpoint, { params })
  return data?.data || {}
}

export async function getTopTenCriteria(endpoint, params) {
  const { data } = await api.get(endpoint, { params })
  return {
    data: data?.data || {},
    filter: data?.filter || {},
  }
}

