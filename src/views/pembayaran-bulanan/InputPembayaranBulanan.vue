<script setup>
/**
 * INPUT PEMBAYARAN BULANAN.
 * Flow sama dengan SCC:
 * 1. Isi kode pembayaran -> Cek ke submission/dependent-payment/check/{code}
 * 2. Isi data rekening
 * 3. Simpan ke submission/dependent-payment
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSession } from '@/lib/auth'
import {
  getBankOptions,
  checkDependentPaymentCode,
  storeDependentPayment,
} from '@/lib/services/monthlyPayment'
import { rupiah } from '@/lib/format'
import { useMeta } from '@/composables/useMeta'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

useMeta({ title: 'Input Pembayaran Bulanan' })

const router = useRouter()
const session = getSession()

const dependentCode = ref('')
const totalDependent = ref('')
const totalDebitur = ref('')
const accountName = ref('')
const bankAccountNumber = ref('')
const bankBranchName = ref('')
const bank = ref(null)
const bankOptions = ref([])
const checking = ref(false)
const saving = ref(false)
const submitted = ref(false)

onMounted(async () => {
  bankOptions.value = await getBankOptions()
})

function alert(icon, title) {
  window.Swal.fire({ icon, title, padding: '2em' })
}

function onlyNumber() {
  bankAccountNumber.value = String(bankAccountNumber.value || '').replace(/\D/g, '')
}

async function cekKode() {
  if (!dependentCode.value) return alert('error', 'Wajib isi kode pembayaran')
  checking.value = true
  try {
    const res = await checkDependentPaymentCode(dependentCode.value)
    if (res.status === 200) {
      totalDependent.value = res.data?.total_dependent ?? ''
      totalDebitur.value = res.data?.total_debitur ?? ''
      alert('success', 'Kode Pembayaran terdaftar di sistem')
    } else {
      alert('error', res.message || 'Kode pembayaran tidak ditemukan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    checking.value = false
  }
}

function valid() {
  if (!dependentCode.value) return 'Wajib isi kode pembayaran'
  if (!bank.value) return 'Wajib isi nama bank'
  if (!bankAccountNumber.value) return 'Wajib isi nomor rekening'
  if (!accountName.value) return 'Wajib isi atas nama rekening'
  if (!bankBranchName.value) return 'Wajib isi nama cabang bank'
  return ''
}

async function simpan() {
  submitted.value = true
  const error = valid()
  if (error) return alert('error', error)

  saving.value = true
  try {
    const res = await storeDependentPayment({
      dependent_code: dependentCode.value,
      bank_name: bank.value,
      bank_account_number: parseInt(bankAccountNumber.value, 10),
      account_name: accountName.value,
      bank_branch_name: bankBranchName.value,
      user_id: parseInt(session.userId, 10),
    })
    if (res.data?.status === 200) {
      await window.Swal.fire({ icon: 'success', title: 'Berhasil!', padding: '2em' })
      router.push({ name: 'list-pembayaran-bulanan' })
    } else {
      alert('error', res.data?.message || 'Terjadi Kesalahan')
    }
  } catch {
    alert('error', 'Terjadi Kesalahan')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Input Pembayaran Bulanan" subtitle="Daftarkan kode pembayaran dan rekening penerima." />

    <Card>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label class="form-label">Kode Pembayaran <span class="text-danger">*</span></label>
          <div class="flex gap-2">
            <input
              v-model="dependentCode"
              type="text"
              class="form-input"
              :class="{ 'border-danger': submitted && !dependentCode }"
              placeholder="Masukan Kode Pembayaran"
            />
            <BaseButton variant="primary" :loading="checking" @click="cekKode">Cek</BaseButton>
          </div>
        </div>

        <div>
          <label class="form-label">Total Pembayaran</label>
          <input :value="totalDependent ? rupiah(totalDependent) : ''" type="text" class="form-input" readonly />
        </div>
        <div>
          <label class="form-label">Total Debitur</label>
          <input v-model="totalDebitur" type="text" class="form-input" readonly />
        </div>
        <div>
          <label class="form-label">Atas Nama Rekening <span class="text-danger">*</span></label>
          <input
            v-model="accountName"
            type="text"
            class="form-input"
            :class="{ 'border-danger': submitted && !accountName }"
            placeholder="Masukan Atas Nama Rekening"
          />
        </div>
        <div>
          <label class="form-label">Nomor Rekening <span class="text-danger">*</span></label>
          <input
            v-model="bankAccountNumber"
            type="text"
            class="form-input"
            :class="{ 'border-danger': submitted && !bankAccountNumber }"
            placeholder="Masukan Nomor Rekening"
            @input="onlyNumber"
          />
        </div>
        <BaseSelect
          v-model="bank"
          :options="bankOptions"
          label="Nama Bank"
          placeholder="Pilih Bank"
          required
        />
        <div>
          <label class="form-label">Nama Cabang Bank <span class="text-danger">*</span></label>
          <input
            v-model="bankBranchName"
            type="text"
            class="form-input"
            :class="{ 'border-danger': submitted && !bankBranchName }"
            placeholder="Masukan Nama Cabang Bank"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton variant="primary" :loading="saving" @click="simpan">Simpan</BaseButton>
      </div>
    </Card>
  </div>
</template>
