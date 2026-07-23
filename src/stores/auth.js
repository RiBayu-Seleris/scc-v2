import { defineStore } from 'pinia'
import api from '@/lib/api'
import { setSession, clearSession, getSession, isLoggedIn } from '@/lib/auth'
import {
  defaultFlags,
  computeRoleFlags,
  applySelectBankFlags,
  withDerivedFlags,
} from '@/lib/menuFlags'

/**
 * STORE AUTENTIKASI (state global untuk login & hak akses menu).
 *
 * Endpoint SAMA PERSIS dengan ehd-backoffice:
 *   POST auth/login                      -> { status, data:{ token, user_code, role, ... } }
 *   GET  auth/data/{userCode}            -> { status, data:{ ...profil user } }
 *   GET  dashboard/select-bank           -> { status, data:[ { partner_id, ... } ] }
 *   POST auth/send-email-forgot-password -> { status }
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // profil user dari auth/data
    session: getSession(), // token, role, dsb dari localStorage
    menuFlags: withDerivedFlags(defaultFlags()), // flag hak akses menu
    partners: [],
    loading: false,
  }),

  getters: {
    isAuthenticated: () => isLoggedIn(),
    userCode: (s) => s.session.userCode,
    role: (s) => s.session.role,
    selectedPartnerName: (s) => s.session.partnerName || '',
  },

  actions: {
    /**
     * Proses login. Return { ok, message }.
     * @param {string} username
     * @param {string} password
     */
    async login(username, password) {
      this.loading = true
      try {
        const { data } = await api.post('auth/login', { username, password })
        if (data.status === 200) {
          setSession(data.data)
          this.session = getSession()
          return { ok: true }
        }
        return { ok: false, message: 'Email Pengguna atau Kata Sandi Salah' }
      } catch (e) {
        // Pesan aman untuk user; detail teknis tidak diekspos.
        return { ok: false, message: e?.response?.data?.message || 'Gagal masuk. Coba lagi.' }
      } finally {
        this.loading = false
      }
    },

    /** Ambil profil user (auth/data). Return objek user atau null. */
    async fetchUser() {
      const code = this.session.userCode
      if (!code) return null
      try {
        const { data } = await api.get('auth/data/' + code)
        if (data.status === 200) {
          this.user = data.data
          return data.data
        }
      } catch {
        // Diamkan — kalau 401, interceptor di lib/api.js yang mengalihkan ke login.
      }
      return null
    },

    /**
     * Hitung flag hak akses menu berdasarkan role & partner user.
     * Dipanggil sekali saat layout utama dimuat.
     */
    async loadMenuFlags() {
      const user = this.user || (await this.fetchUser())
      if (!user) return this.menuFlags

      const partnerIdSelected = parseInt(this.session.partnerId, 10)
      let flags = computeRoleFlags(user, partnerIdSelected)

      // SCC berhenti setelah mengenali Takaful; dashboard/select-bank tidak
      // diperlukan untuk menentukan menu khusus perusahaan ini.
      if (flags.insuranceMenu) {
        this.menuFlags = withDerivedFlags(flags)
        return this.menuFlags
      }

      let selectBank = []
      if (user.role !== 'Management' && user.role !== 'Director') {
        try {
          selectBank = await this.loadPartners()
        } catch {
          // Kalau gagal, pakai localStorage yang ada.
        }
      }

      // Management/Director tidak perlu data bank tambahan.
      if (!flags.isManagement && !flags.isDirector) {
        try {
          flags = applySelectBankFlags(flags, user, selectBank, partnerIdSelected)
        } catch {
          // Kalau gagal, pakai flag dasar dari role saja.
        }
      }

      this.menuFlags = withDerivedFlags(flags)
      return this.menuFlags
    },

    /**
     * Ambil daftar bank/partner untuk dropdown header.
     * Endpoint dan search query sama dengan ehd-backoffice `dashboard/select-bank`.
     */
    async loadPartners(search = '') {
      const path = search ? 'dashboard/select-bank?search=' + encodeURIComponent(search) : 'dashboard/select-bank'
      const { data } = await api.get(path)
      const partners = data?.data || []
      this.partners = partners
      // Hanya tetapkan pilihan bank saat memuat daftar PENUH (tanpa search).
      // Pencarian hanya memfilter tampilan dropdown; TIDAK boleh mengubah bank yang
      // sedang dipilih — sama seperti SCC (searchData hanya mengisi `partners`).
      if (!search) this.ensureSelectedPartner(partners)
      return partners
    },

    /**
     * Sinkronkan partner aktif dengan daftar bank. Bila localStorage kosong atau
     * sudah tidak valid, pilih item pertama seperti header lama.
     */
    ensureSelectedPartner(partners = this.partners) {
      if (!partners.length) return
      const currentId = parseInt(localStorage.getItem('partnerIdSelected'), 10)
      const currentName = localStorage.getItem('partnerNameSelected')
      const byId = partners.find((p) => parseInt(p.partner_id, 10) === currentId)
      const byName = partners.find((p) => p.partner_name === currentName)
      const selected = byId || byName || partners[0]
      if (!selected) return

      localStorage.setItem('partnerIdSelected', selected.partner_id ?? '')
      localStorage.setItem('partnerNameSelected', selected.partner_name ?? '')
      this.session = getSession()
    },

    /**
     * Pilih bank dari header. Perilaku lama melakukan reload penuh agar semua
     * list membaca `partnerIdSelected` baru; kita pertahankan behavior itu.
     */
    selectPartner(partner) {
      if (!partner) return
      localStorage.setItem('partnerIdSelected', partner.partner_id ?? '')
      localStorage.setItem('partnerNameSelected', partner.partner_name ?? '')
      this.session = getSession()
      window.location.reload()
    },

    /** Kirim email reset kata sandi. Return true bila berhasil. */
    async forgotPassword(username) {
      const { data } = await api.post('auth/send-email-forgot-password', { username })
      return data.status === 200
    },

    /**
     * Keluar. Sama seperti ehd-backoffice: beri tahu server (POST auth/logout)
     * lalu hapus sesi & kembali ke halaman login. Redirect tetap dijalankan
     * walau panggilan server gagal, supaya user tidak "terjebak".
     */
    async logout() {
      const userCode = this.session.userCode
      try {
        if (userCode) await api.post('auth/logout', { user_code: userCode })
      } catch {
        // Diabaikan — kegagalan logout server tidak boleh menghalangi keluar.
      } finally {
        clearSession()
        this.user = null
        this.session = getSession()
        window.location.assign('/sign-in')
      }
    },
  },
})
