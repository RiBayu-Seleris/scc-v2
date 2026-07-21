/**
 * Helper sanitasi — pertahanan terhadap XSS (Cross-Site Scripting).
 *
 * XSS = celah keamanan di mana penyerang menyisipkan kode HTML/JS jahat lewat
 * data (mis. nama nasabah berisi <script>). Aturan emas: JANGAN pernah render
 * data dari server/user dengan `v-html`. Kalau benar-benar terpaksa, bersihkan
 * dulu lewat fungsi di file ini.
 */

/**
 * Ubah karakter berbahaya (< > & " ' /) menjadi entitas HTML yang aman.
 * Cocok untuk menampilkan teks apa adanya tanpa risiko dieksekusi sebagai HTML.
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }
  return String(value).replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Buang seluruh tag HTML dari sebuah string (menyisakan teksnya saja).
 * @param {string} value
 * @returns {string}
 */
export function stripTags(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/<[^>]*>/g, '')
}

/**
 * Pastikan sebuah URL aman dipakai (hanya http/https/mailto/tel).
 * Mencegah serangan lewat `javascript:` URL.
 * @param {string} url
 * @returns {string} URL asli bila aman, atau '#' bila berbahaya
 */
export function safeUrl(url) {
  if (!url) return '#'
  const trimmed = String(url).trim()
  if (/^(https?:|mailto:|tel:|\/)/i.test(trimmed)) return trimmed
  return '#'
}
