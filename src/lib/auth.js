/**
 * Helper SESI (session) — mengatur data login di localStorage.
 *
 * Nama key sengaja dibuat SAMA PERSIS dengan ehd-backoffice supaya kontrak API
 * dan perilaku sisi server tidak berubah.
 *
 * Catatan keamanan: token disimpan di localStorage karena API mewajibkan header
 * Bearer (harus bisa dibaca JavaScript). Karena itu pencegahan XSS jadi prioritas
 * — lihat docs/KEAMANAN.md.
 */

// Daftar key localStorage di satu tempat supaya tidak salah ketik.
const KEYS = {
  loggedIn: 'loggedIn',
  token: 'token',
  userCode: 'userCode',
  userId: 'userId',
  role: 'role',
  insuredCompanyId: 'InsuredCompanyId',
  partnerId: 'partnerIdSelected',
  // Bank saat LOGIN — sengaja key terpisah: nilainya TIDAK ikut berubah saat
  // user berganti bank lewat header. Dipakai dashboard Chubb (persis aslinya).
  partnerIdLogin: 'partnerIdSelecteds',
  partnerName: 'partnerNameSelected',
  bancassuranceId: 'bancassuranceId',
  insuranceId: 'insuranceIdSelected',
  insuranceName: 'insuranceNameSelected',
}

/** Ambil token login. Return null bila belum login. */
export function getToken() {
  return localStorage.getItem(KEYS.token)
}

/** Apakah user sudah login? (punya penanda loggedIn DAN token) */
export function isLoggedIn() {
  return !!localStorage.getItem(KEYS.loggedIn) && !!getToken()
}

/**
 * Simpan hasil login. Bentuk `data` sama dengan respons `auth/login`
 * milik ehd-backoffice (response.data.data).
 * @param {object} data
 */
export function setSession(data) {
  localStorage.setItem(KEYS.loggedIn, 'true')
  localStorage.setItem(KEYS.token, data.token ?? '')
  localStorage.setItem(KEYS.userCode, data.user_code ?? '')
  localStorage.setItem(KEYS.userId, data.id ?? '')
  localStorage.setItem(KEYS.role, data.role ?? '')
  localStorage.setItem(KEYS.insuredCompanyId, data.insurance_company_id ?? '')
  localStorage.setItem(KEYS.partnerId, data.partner_id ?? '')
  localStorage.setItem(KEYS.partnerIdLogin, data.partner_id ?? '')
  localStorage.setItem(KEYS.bancassuranceId, data.bancassurance_id ?? '')
  setCookie('token', data.token ?? '', 7)
}

/** Hapus semua data sesi (dipakai saat logout / token kedaluwarsa). */
export function clearSession() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  setCookie('token', '', -1)
}

/** Ambil seluruh data sesi sebagai satu objek (praktis untuk store). */
export function getSession() {
  return {
    loggedIn: localStorage.getItem(KEYS.loggedIn),
    token: localStorage.getItem(KEYS.token),
    userCode: localStorage.getItem(KEYS.userCode),
    userId: localStorage.getItem(KEYS.userId),
    role: localStorage.getItem(KEYS.role),
    insuredCompanyId: localStorage.getItem(KEYS.insuredCompanyId),
    partnerId: localStorage.getItem(KEYS.partnerId),
    partnerIdLogin: localStorage.getItem(KEYS.partnerIdLogin),
    partnerName: localStorage.getItem(KEYS.partnerName),
    bancassuranceId: localStorage.getItem(KEYS.bancassuranceId),
    insuranceId: localStorage.getItem(KEYS.insuranceId),
    insuranceName: localStorage.getItem(KEYS.insuranceName),
  }
}

/* ---------- Helper cookie (dipindahkan apa adanya dari sign_in.vue lama) ---------- */

/** Set cookie sederhana dengan masa berlaku (hari). */
export function setCookie(name, value, days) {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = '; expires=' + date.toUTCString()
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/'
}

/** Baca nilai cookie berdasarkan nama. Return null bila tidak ada. */
export function getCookie(name) {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let c of ca) {
    while (c.charAt(0) === ' ') c = c.substring(1)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length)
  }
  return null
}
