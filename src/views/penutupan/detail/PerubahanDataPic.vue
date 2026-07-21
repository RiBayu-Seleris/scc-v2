<script setup>
/**
 * DETAIL PENUTUPAN — PERUBAHAN DATA PIC.
 * Port dari seleris-credit-cover `views/detail/perubahan_data_pic.vue`.
 *
 * Alur (persis aslinya):
 *  1. Pilih Kategori: UAT atau PRODUCTION.
 *  2. Setiap kali kategori berubah -> muat daftar akun/PIC dari
 *     GET submission/account/list?submission_id={id}&uat={true|false}.
 *  3. Pilih akun (ditampilkan sebagai email/username); Nama & No. HP PIC ikut terisi.
 *  4. Simpan -> PUT submission/account/{id} dengan
 *     { uat, member_id, member_code, branch_id }.
 *
 * Tab ini hanya tampil untuk Admin (showMenuForAdmin) — gating ada di penutupanDetailTabs.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSession } from '@/lib/auth'
import {
  getSubmissionAccounts,
  getSubmissionDebitur,
  updateSubmissionAccount,
} from '@/lib/services/submission'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Detail Penutupan — Perubahan Data PIC' })

const route = useRoute()
const auth = useAuthStore()
const id = route.params.id

const category = ref(null) // 'UAT' | 'PRODUCTION'
const categoryOptions = ['UAT', 'PRODUCTION']
const accountOptions = ref([])
const selectedMemberId = ref(null)
const loadingAccounts = ref(false)
const saving = ref(false)
const role = ref(getSession().role || '')
const showDokumenSpajkPage = ref(false)

// Akun yang sedang dipilih (untuk menampilkan Nama & No. HP PIC).
const selectedAccount = computed(() =>
  accountOptions.value.find((a) => a.member_id === selectedMemberId.value) || null,
)
const picName = computed(() => selectedAccount.value?.pic_name || '')
const picPhone = computed(() => selectedAccount.value?.pic_phone || '')
const tabContext = computed(() => ({
  showDokumenSpajkPage: showDokumenSpajkPage.value,
  showMenuForBank: !['Bank', 'Branch Bank'].includes(role.value),
  showMenuForAdmin: role.value === 'Admin',
}))

function alert(icon, title) {
  return window.Swal.fire({ icon, title, padding: '2em' })
}

/** Muat daftar akun sesuai kategori terpilih. */
async function loadAccounts() {
  accountOptions.value = []
  selectedMemberId.value = null
  if (!category.value) return
  loadingAccounts.value = true
  try {
    accountOptions.value = await getSubmissionAccounts(id, category.value === 'UAT')
  } catch {
    accountOptions.value = []
    alert('error', 'Terjadi kesalahan saat mengambil data')
  } finally {
    loadingAccounts.value = false
  }
}

watch(category, loadAccounts)

async function initializePage() {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Tab admin tidak boleh meminta detail atau daftar akun bila profil gagal.
    if (!user || user.role !== 'Admin') return
    const detail = await getSubmissionDebitur(id)
    showDokumenSpajkPage.value = !detail.insert_spajk
    role.value = user.role
  } catch {
    return
  }
  await loadAccounts()
}

onMounted(initializePage)

async function submit() {
  if (role.value !== 'Admin') return
  if (!category.value) return alert('warning', 'Kategori Wajib Diisi!')
  const account = selectedAccount.value
  if (!account || !account.member_id) return alert('warning', 'Email Wajib Dipilih!')

  saving.value = true
  try {
    const { data } = await updateSubmissionAccount(id, {
      uat: category.value === 'UAT',
      member_id: account.member_id,
      member_code: account.member_code,
      branch_id: account.branch_id || null,
    })
    if (data?.status === 200) {
      await alert('success', 'Berhasil!')
      window.location.reload()
    } else {
      alert('error', 'Terjadi Kesalahan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DetailTabsLayout
    :tabs="penutupanDetailTabs"
    :id="id"
    title="Perubahan Data PIC"
    :back="{ name: 'list-data-pengajuan-non-medis' }"
    :tab-context="tabContext"
  >
    <Card title="Perubahan Data PIC">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseSelect
          v-model="category"
          :options="categoryOptions"
          label="Kategori"
          placeholder="Pilih Kategori"
          required
          :searchable="false"
        />

        <BaseSelect
          v-model="selectedMemberId"
          :options="accountOptions"
          option-label="email"
          option-value="member_id"
          label="Email"
          :placeholder="loadingAccounts ? 'Memuat...' : 'Pilih Email'"
          :disabled="!category || loadingAccounts || !accountOptions.length"
          required
        />

        <div>
          <label class="form-label">Nama PIC</label>
          <input :value="picName" class="form-input" disabled placeholder="-" />
        </div>
        <div>
          <label class="form-label">No. Handphone PIC</label>
          <input :value="picPhone" class="form-input" disabled placeholder="-" />
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <BaseButton variant="primary" :loading="saving" @click="submit">Simpan</BaseButton>
      </div>
    </Card>
  </DetailTabsLayout>
</template>
