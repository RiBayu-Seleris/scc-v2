<template>
  <div ref="rootEl" class="drp">
    <button type="button" class="drp-trigger" @click="toggle">
      <svg class="drp-trigger-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      <span class="drp-trigger-label">{{ triggerLabel }}</span>
    </button>
    <div v-if="open" class="drp-panel">
      <div class="drp-body">
        <div class="drp-presets">
          <button v-for="preset in presets" :key="preset.value" type="button" class="drp-preset" :class="{ active: activePreset === preset.value }" @click="applyPreset(preset.value)">{{ preset.label }}</button>
        </div>
        <div class="drp-cal">
          <div class="drp-cal-head"><button type="button" class="drp-nav" @click="prevMonth"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg></button><div class="drp-cal-title">{{ monthTitle(leftMonth) }}</div><span class="drp-nav-spacer" /></div>
          <div class="drp-weekdays"><span v-for="day in dayNames" :key="`l${day}`">{{ day }}</span></div>
          <div class="drp-days"><button v-for="(cell, index) in leftGrid" :key="`l${index}`" type="button" class="drp-day" :class="dayClasses(cell)" :disabled="!cell.inMonth || isFutureDay(cell.date)" @click="selectDay(cell)">{{ cell.day }}</button></div>
        </div>
        <div class="drp-cal">
          <div class="drp-cal-head"><span class="drp-nav-spacer" /><div class="drp-cal-title">{{ monthTitle(rightMonth) }}</div><button type="button" class="drp-nav" @click="nextMonth"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg></button></div>
          <div class="drp-weekdays"><span v-for="day in dayNames" :key="`r${day}`">{{ day }}</span></div>
          <div class="drp-days"><button v-for="(cell, index) in rightGrid" :key="`r${index}`" type="button" class="drp-day" :class="dayClasses(cell)" :disabled="!cell.inMonth || isFutureDay(cell.date)" @click="selectDay(cell)">{{ cell.day }}</button></div>
        </div>
      </div>
      <div class="drp-times"><div class="drp-time-field"><label>Jam Mulai</label><input v-model="startTime" type="time" /></div><div class="drp-time-field"><label>Jam Selesai</label><input v-model="endTime" type="time" /></div></div>
      <div class="drp-footer"><span class="drp-preview">{{ previewLabel }}</span><div class="drp-actions"><button type="button" class="drp-btn drp-cancel" @click="cancel">Batal</button><button type="button" class="drp-btn drp-apply" @click="apply">Terapkan</button></div></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { moment } from '@/lib/format'

const props = defineProps({ start: { type: [Date, String], default: null }, end: { type: [Date, String], default: null } })
const emit = defineEmits(['apply'])
const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const presets = [{ label: 'Hari Ini', value: 'today' }, { label: 'Kemarin', value: 'yesterday' }, { label: '7 Hari Terakhir', value: 'last_7' }, { label: '30 Hari Terakhir', value: 'last_30' }, { label: 'Bulan Ini', value: 'this_month' }, { label: 'Bulan Lalu', value: 'last_month' }, { label: 'Kustom', value: 'custom' }]

const rootEl = ref(null)
const open = ref(false)
const activePreset = ref('custom')
const initialStart = props.start ? moment(props.start) : moment().startOf('month')
const initialEnd = props.end ? moment(props.end) : moment().endOf('month')
const appliedStart = ref(initialStart.clone())
const appliedEnd = ref(initialEnd.clone())
const pendingStart = ref(initialStart.clone())
const pendingEnd = ref(initialEnd.clone())
const startTime = ref(props.start ? moment(props.start).format('HH:mm') : '00:00')
const endTime = ref(props.end ? moment(props.end).format('HH:mm') : '23:59')
const leftMonth = ref(initialStart.clone().startOf('month'))
const rightMonth = computed(() => leftMonth.value.clone().add(1, 'month'))

function buildGrid(month) {
  const first = month.clone().startOf('month')
  const gridStart = first.clone().subtract((first.day() + 6) % 7, 'days')
  return Array.from({ length: 42 }, (_, index) => {
    const date = gridStart.clone().add(index, 'days')
    return { date, day: date.date(), inMonth: date.month() === month.month() }
  })
}
const leftGrid = computed(() => buildGrid(leftMonth.value))
const rightGrid = computed(() => buildGrid(rightMonth.value))
const monthTitle = (month) => `${monthNamesId[month.month()]} ${month.year()}`
const isFutureDay = (date) => date.isAfter(moment(), 'day')
const formatEnLong = (date) => `${monthNamesEn[date.month()]} ${date.date()}, ${date.year()}`
const triggerLabel = computed(() => !appliedStart.value || !appliedEnd.value ? 'Pilih tanggal' : `${formatEnLong(appliedStart.value)} ${appliedStart.value.format('HH:mm')} - ${formatEnLong(appliedEnd.value)} ${appliedEnd.value.format('HH:mm')}`)
const previewLabel = computed(() => `${pendingStart.value ? `${pendingStart.value.format('MM/DD/YYYY')} ${startTime.value}` : '…'} - ${pendingEnd.value ? `${pendingEnd.value.format('MM/DD/YYYY')} ${endTime.value}` : '…'}`)

function dayClasses(cell) {
  const classes = []
  if (!cell.inMonth) classes.push('other-month')
  if (pendingStart.value && cell.date.isSame(pendingStart.value, 'day')) classes.push('is-start')
  if (pendingEnd.value && cell.date.isSame(pendingEnd.value, 'day')) classes.push('is-end')
  if (pendingStart.value && pendingEnd.value && cell.date.isSameOrAfter(pendingStart.value, 'day') && cell.date.isSameOrBefore(pendingEnd.value, 'day')) classes.push('in-range')
  return classes
}
function selectDay(cell) {
  if (!cell.inMonth || isFutureDay(cell.date)) return
  const date = cell.date.clone()
  if (!pendingStart.value || pendingEnd.value) { pendingStart.value = date; pendingEnd.value = null } else if (date.isBefore(pendingStart.value, 'day')) { pendingEnd.value = pendingStart.value.clone(); pendingStart.value = date } else pendingEnd.value = date
  activePreset.value = 'custom'
}
function applyPreset(value) {
  activePreset.value = value
  const today = moment().startOf('day')
  let start = today.clone(); let end = today.clone()
  if (value === 'yesterday') { start = today.clone().subtract(1, 'day'); end = start.clone() }
  else if (value === 'last_7') start = today.clone().subtract(6, 'days')
  else if (value === 'last_30') start = today.clone().subtract(29, 'days')
  else if (value === 'this_month') { start = today.clone().startOf('month'); end = today.clone().endOf('month') }
  else if (value === 'last_month') { start = today.clone().subtract(1, 'month').startOf('month'); end = today.clone().subtract(1, 'month').endOf('month') }
  else if (value === 'custom') return
  const maxDay = moment().startOf('day')
  if (start.isAfter(maxDay, 'day')) start = maxDay.clone()
  if (end.isAfter(maxDay, 'day')) end = maxDay.clone()
  pendingStart.value = start; pendingEnd.value = end; leftMonth.value = start.clone().startOf('month')
}
const prevMonth = () => { leftMonth.value = leftMonth.value.clone().subtract(1, 'month') }
const nextMonth = () => { leftMonth.value = leftMonth.value.clone().add(1, 'month') }
function syncPendingFromApplied() {
  pendingStart.value = appliedStart.value ? appliedStart.value.clone() : moment().startOf('month')
  pendingEnd.value = appliedEnd.value ? appliedEnd.value.clone() : moment().endOf('month')
  leftMonth.value = pendingStart.value.clone().startOf('month')
  if (appliedStart.value) startTime.value = appliedStart.value.format('HH:mm')
  if (appliedEnd.value) endTime.value = appliedEnd.value.format('HH:mm')
}
function toggle() { if (!open.value) syncPendingFromApplied(); open.value = !open.value }
const cancel = () => { open.value = false }
function apply() {
  if (!pendingStart.value) return
  const [startHour, startMinute] = String(startTime.value || '').split(':').map(Number)
  const [endHour, endMinute] = String(endTime.value || '').split(':').map(Number)
  const start = pendingStart.value.clone().hour(startHour || 0).minute(startMinute || 0).second(0)
  const end = (pendingEnd.value || pendingStart.value).clone().hour(endHour || 0).minute(endMinute || 0).second(59)
  appliedStart.value = start.clone(); appliedEnd.value = end.clone()
  emit('apply', { start: start.toDate(), end: end.toDate() })
  open.value = false
}
function onDocumentMouseDown(event) { if (open.value && rootEl.value && !rootEl.value.contains(event.target)) open.value = false }
onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown))
</script>

<style scoped>
.drp { position: relative; display: inline-block; }
.drp-trigger { display: inline-flex; align-items: center; gap: 10px; min-width: 320px; padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; color: #374151; font-weight: 600; cursor: pointer; transition: border-color .15s ease; }
.drp-trigger:hover { border-color: #c7cbf5; }.drp-trigger-icon { color: #6b7280; flex-shrink: 0; }.drp-trigger-label { white-space: nowrap; }
.drp-panel { position: absolute; top: calc(100% + 10px); left: 0; z-index: 1000; background: #fff; border: 1px solid #eceef2; border-radius: 14px; box-shadow: 0 12px 40px rgba(17,24,39,.12); padding: 8px; min-width: 720px; }.drp-body { display: flex; gap: 8px; padding: 10px 6px; }
.drp-presets { display: flex; flex-direction: column; gap: 2px; min-width: 150px; padding-right: 8px; }.drp-preset { text-align: left; background: transparent; border: none; border-radius: 8px; padding: 10px 14px; color: #374151; font-size: 14px; cursor: pointer; border-left: 3px solid transparent; transition: background .12s ease,color .12s ease; }.drp-preset:hover { background: #f5f6fb; }.drp-preset.active { background: #eef0fe; color: #5c6bef; border-left-color: #5c6bef; font-weight: 600; }
.drp-cal { padding: 0 10px; }.drp-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; height: 28px; }.drp-cal-title { font-weight: 600; color: #1f2937; }.drp-nav { background: transparent; border: none; color: #374151; cursor: pointer; padding: 2px; border-radius: 6px; display: inline-flex; }.drp-nav:hover { background: #f1f1fd; color: #5c6bef; }.drp-nav-spacer { width: 22px; height: 22px; }
.drp-weekdays,.drp-days { display: grid; grid-template-columns: repeat(7,40px); gap: 2px; }.drp-weekdays { margin-bottom: 6px; }.drp-weekdays span { text-align: center; font-size: 13px; color: #6b7280; padding: 4px 0; }.drp-day { height: 38px; width: 40px; border: none; background: transparent; color: #1f2937; font-size: 14px; cursor: pointer; border-radius: 8px; }.drp-day:hover:not(:disabled) { background: #f1f1fd; }.drp-day.other-month,.drp-day:disabled { color: #cbd0d8; cursor: not-allowed; background: transparent; }.drp-day.in-range { background: #eef0fe; color: #5c6bef; border-radius: 0; }.drp-day.is-start,.drp-day.is-end { background: #5c6bef !important; color: #fff !important; border-radius: 8px; font-weight: 600; }
.drp-times { display: flex; gap: 20px; padding: 12px 16px 4px; border-top: 1px solid #eef0f2; }.drp-time-field { display: flex; align-items: center; gap: 10px; }.drp-time-field label { font-size: 13px; font-weight: 600; color: #374151; margin: 0; }.drp-time-field input[type=time] { border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 10px; color: #1f2937; font-size: 14px; background: #fff; }.drp-time-field input[type=time]:focus { outline: none; border-color: #5c6bef; }
.drp-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 10px 16px 8px; }.drp-preview { color: #374151; font-size: 14px; margin-right: auto; padding-left: 4px; }.drp-actions { display: flex; gap: 10px; }.drp-btn { border: none; border-radius: 8px; padding: 9px 18px; font-weight: 600; cursor: pointer; font-size: 14px; }.drp-cancel { background: #f1f2f5; color: #374151; }.drp-cancel:hover { background: #e6e8ec; }.drp-apply { background: #5c6bef; color: #fff; }.drp-apply:hover { background: #4a58d8; }
@media (max-width:780px) { .drp-panel { min-width: unset; width: 92vw; }.drp-body { flex-direction: column; }.drp-weekdays,.drp-days { grid-template-columns: repeat(7,1fr); }.drp-day { width: 100%; } }
</style>
