import api from '@/lib/api'

/**
 * Unggah satu berkas ke server (endpoint umum upload-file).
 * Server membalas path/URL berkas yang lalu dipakai saat mendaftarkan dokumen.
 * @param {File} fileObj objek File dari <input type="file">
 * @returns {Promise<string>} path berkas hasil upload
 */
export async function uploadFile(fileObj) {
  const formData = new FormData()
  formData.append('file', fileObj)
  const { data } = await api.post('upload-file', formData)
  if (data.status === 200) return data.data.path
  throw new Error('Gagal mengunggah berkas')
}
