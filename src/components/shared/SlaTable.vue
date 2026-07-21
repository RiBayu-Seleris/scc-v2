<script setup>
/**
 * TABEL SLA (reusable) — menampilkan tahapan SLA sebuah restitusi/klaim.
 * Data berupa array tahap: { sla_name, role, status, performance,
 * time_required_description, time_used_description, document_required }.
 */
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

defineProps({
  stages: { type: Array, default: () => [] },
})

// Warna badge performa: tepat waktu = hijau, terlambat = merah.
function perfVariant(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('tepat') || t.includes('on time') || t.includes('sesuai')) return 'success'
  if (t.includes('lambat') || t.includes('telat') || t.includes('late')) return 'danger'
  return 'muted'
}
</script>

<template>
  <Card no-body>
    <EmptyState v-if="!stages.length" message="Belum ada data SLA" class="py-10" />
    <div v-else class="table-wrap border-0">
      <table class="table">
        <thead>
          <tr>
            <th>Tahap</th>
            <th>Role</th>
            <th>Status</th>
            <th>Performa</th>
            <th>Waktu Dibutuhkan</th>
            <th>Waktu Terpakai</th>
            <th>Dokumen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in stages" :key="i">
            <td class="font-medium text-slate-700 dark:text-slate-200">{{ s.sla_name || '-' }}</td>
            <td>{{ s.role || '-' }}</td>
            <td><Badge variant="primary">{{ s.status || '-' }}</Badge></td>
            <td><Badge :variant="perfVariant(s.performance)">{{ s.performance || '-' }}</Badge></td>
            <td>{{ s.time_required_description || '-' }}</td>
            <td>{{ s.time_used_description || '-' }}</td>
            <td>{{ s.document_required || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
