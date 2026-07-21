<script setup>
/**
 * DETAIL PENUTUPAN — FAKULTATIF.
 * Endpoint sumber:
 * - submission/facultative/{id}
 * - submission/facultative/reassurance/{treatyId}
 * - submission/facultative/retrosesi/{treatyId}
 */
import { computed, onMounted, ref } from 'vue'
import { getSession } from '@/lib/auth'
import { useAuthStore } from '@/stores/auth'
import {
  getSubmissionFacultative,
  getSubmissionRequiredDocuments,
  updateFacultativeReassurance,
  updateFacultativeRetrosesi,
} from '@/lib/services/submission'
import { formatNumber, parseNumber, rupiah } from '@/lib/format'
import { penutupanDetailTabs } from '@/config/detailTabs'
import { useMeta } from '@/composables/useMeta'
import { useRoute } from 'vue-router'
import DetailTabsLayout from '@/components/layout/DetailTabsLayout.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Spinner from '@/components/ui/Spinner.vue'
import SubmissionRequiredDocuments from '@/components/shared/SubmissionRequiredDocuments.vue'

useMeta({ title: 'Detail Penutupan — Fakultatif' })

const route = useRoute()
const auth = useAuthStore()
const session = getSession()
const id = route.params.id
const loading = ref(true)
const reassurances = ref([])
const retrocessions = ref([])
const requiredDocuments = ref([])
const savingKey = ref('')
const treatyTypes = ['Quota Share', 'Surplus', 'Combination']
const currentRole = computed(() => auth.user?.role || session.role)
const canNotify = computed(() => !['Reassurance', 'Retrosesi'].includes(currentRole.value))

onMounted(async () => {
  try {
    const user = auth.user || (await auth.fetchUser())
    // Profil wajib tersedia agar data fakultatif tidak diminta tanpa scope role.
    if (!user) return
    const [data, documents] = await Promise.all([
      getSubmissionFacultative(id),
      getSubmissionRequiredDocuments(id),
    ])
    reassurances.value = normalizeList((data.reassurance || []).filter((item) => item.is_facultative))
    retrocessions.value = normalizeList((data.retrosesi || []).filter((item) => item.is_facultative))
    requiredDocuments.value = documents
  } finally {
    loading.value = false
  }
})

function normalizeList(list) {
  return list.map((item) => ({
    ...item,
    _surplusText: item.surplus ? formatNumber(item.surplus) : '',
    _quotaShareText: item.quota_share ?? '',
  }))
}

function canEdit(item, type) {
  if (currentRole.value === 'Admin') return true
  if (type === 'reassurance' && currentRole.value === 'Reassurance') {
    return String(item.reassurance_id) === String(auth.user?.reassurance_id)
  }
  if (type === 'retrosesi' && currentRole.value === 'Retrosesi') {
    return String(item.retrosesi_id) === String(auth.user?.retrosesi_id)
  }
  return false
}

function normalizeSurplus(item) {
  const n = parseNumber(item._surplusText)
  item._surplusText = n ? formatNumber(n) : ''
}

function payload(item) {
  return {
    treaty_type: item.treaty_type,
    quota_share: parseInt(item._quotaShareText || 0, 10),
    surplus: parseNumber(item._surplusText),
  }
}

async function save(item, type) {
  if (!canEdit(item, type)) return
  const idKey = type === 'reassurance' ? 'reassurance_treaty_id' : 'retrosesi_treaty_id'
  const treatyId = item[idKey]
  savingKey.value = `${type}:${treatyId}`
  try {
    const res = type === 'reassurance'
      ? await updateFacultativeReassurance(treatyId, payload(item))
      : await updateFacultativeRetrosesi(treatyId, payload(item))
    if (res.data?.status === 200) {
      window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
    } else {
      window.Swal.fire({ icon: 'error', text: 'Terjadi Kesalahan', padding: '1em' })
    }
  } catch {
    window.Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', padding: '2em' })
  } finally {
    savingKey.value = ''
  }
}
</script>

<template>
  <DetailTabsLayout :tabs="penutupanDetailTabs" :id="id" title="Detail Penutupan" :back="{ name: 'list-data-pengajuan-non-medis' }">
    <div v-if="loading" class="flex justify-center py-16 text-slate-400">
      <Spinner size="lg" />
    </div>

    <div v-else class="space-y-5">
      <SubmissionRequiredDocuments :submission-id="id" :documents="requiredDocuments" :can-notify="canNotify" />
      <Card title="Reasuransi">
        <EmptyState v-if="!reassurances.length" message="Tidak ada data reasuransi fakultatif" />
        <div v-else class="space-y-4">
          <div v-for="item in reassurances" :key="item.reassurance_treaty_id" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="font-semibold text-slate-800 dark:text-slate-100">{{ item.reassurance_name || item.company_name || 'Reasuransi' }}</h4>
                <p class="text-sm text-slate-500">Treaty ID: {{ item.reassurance_treaty_id }}</p>
              </div>
              <p class="text-sm text-slate-500">Surplus saat ini: {{ rupiah(item.surplus) }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BaseSelect v-model="item.treaty_type" :options="treatyTypes" label="Treaty Type" placeholder="Pilih Treaty" :disabled="!canEdit(item, 'reassurance')" />
              <div>
                <label class="form-label">Quota Share (%)</label>
                <input v-model="item._quotaShareText" class="form-input" inputmode="numeric" :disabled="!canEdit(item, 'reassurance')" @input="item._quotaShareText = String(item._quotaShareText).replace(/\\D/g, '')" />
              </div>
              <div>
                <label class="form-label">Surplus</label>
                <input v-model="item._surplusText" class="form-input" :disabled="!canEdit(item, 'reassurance')" @input="normalizeSurplus(item)" />
              </div>
            </div>
            <div v-if="canEdit(item, 'reassurance')" class="mt-4 flex justify-end">
              <BaseButton :loading="savingKey === `reassurance:${item.reassurance_treaty_id}`" @click="save(item, 'reassurance')">Simpan Reasuransi</BaseButton>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Retrosesi">
        <EmptyState v-if="!retrocessions.length" message="Tidak ada data retrosesi fakultatif" />
        <div v-else class="space-y-4">
          <div v-for="item in retrocessions" :key="item.retrosesi_treaty_id" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 class="font-semibold text-slate-800 dark:text-slate-100">{{ item.retrosesi_name || item.company_name || 'Retrosesi' }}</h4>
                <p class="text-sm text-slate-500">Treaty ID: {{ item.retrosesi_treaty_id }}</p>
              </div>
              <p class="text-sm text-slate-500">Surplus saat ini: {{ rupiah(item.surplus) }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BaseSelect v-model="item.treaty_type" :options="treatyTypes" label="Treaty Type" placeholder="Pilih Treaty" :disabled="!canEdit(item, 'retrosesi')" />
              <div>
                <label class="form-label">Quota Share (%)</label>
                <input v-model="item._quotaShareText" class="form-input" inputmode="numeric" :disabled="!canEdit(item, 'retrosesi')" @input="item._quotaShareText = String(item._quotaShareText).replace(/\\D/g, '')" />
              </div>
              <div>
                <label class="form-label">Surplus</label>
                <input v-model="item._surplusText" class="form-input" :disabled="!canEdit(item, 'retrosesi')" @input="normalizeSurplus(item)" />
              </div>
            </div>
            <div v-if="canEdit(item, 'retrosesi')" class="mt-4 flex justify-end">
              <BaseButton :loading="savingKey === `retrosesi:${item.retrosesi_treaty_id}`" @click="save(item, 'retrosesi')">Simpan Retrosesi</BaseButton>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </DetailTabsLayout>
</template>
