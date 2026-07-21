/**
 * Parameter CAKUPAN per-role.
 *
 * Banyak daftar (restitusi, pengajuan, klaim) memfilter data berdasarkan role user:
 * setiap role mengirim id cakupannya sendiri (mis. Broker -> broker_id) plus
 * partner_id yang sedang dipilih. Logika ini dipakai ulang, jadi ditaruh di sini.
 */

/**
 * @param {object} user  profil dari auth/data (punya role & id-id cakupan)
 * @param {string|number} partnerId  partnerIdSelected (localStorage)
 * @returns {object} parameter query untuk dilampirkan ke request daftar
 */
export function roleScopeParams(user, partnerId) {
  const params = { partner_id: partnerId }
  switch (user?.role) {
    case 'Insurance':
      params.insurance_company_id = user.insurance_company_id
      break
    case 'Broker':
      params.broker_id = user.broker_id
      break
    case 'Branch Bank':
      params.member_id = user.member_id
      break
    case 'Reassurance':
      params.reassurance_id = user.reassurance_id
      break
    case 'Retrosesi':
      params.retrosesi_id = user.retrosesi_id
      break
    // 'Bank', 'Admin', dan role lain: cukup partner_id.
  }
  return params
}
