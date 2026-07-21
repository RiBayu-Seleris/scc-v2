<script setup>
/**
 * Canvas tanda tangan tanpa dependency eksternal.
 * Stroke disimpan dalam koordinat relatif agar tetap utuh saat ukuran layar berubah.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  height: { type: Number, default: 240 },
  lineWidth: { type: Number, default: 2 },
})

const canvas = ref(null)
const strokes = ref([])
let activeStroke = null
let activePointerId = null
let resizeObserver = null

function context() {
  return canvas.value?.getContext('2d') || null
}

function resizeCanvas() {
  const element = canvas.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))
  if (element.width !== width || element.height !== height) {
    element.width = width
    element.height = height
  }
  redraw()
}

function setupContext(ctx) {
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = props.lineWidth
}

function drawStroke(ctx, stroke, width, height) {
  if (!stroke.length) return
  ctx.beginPath()
  ctx.moveTo(stroke[0].x * width, stroke[0].y * height)
  if (stroke.length === 1) {
    ctx.lineTo(stroke[0].x * width + 0.01, stroke[0].y * height + 0.01)
  } else {
    for (let index = 1; index < stroke.length; index += 1) {
      ctx.lineTo(stroke[index].x * width, stroke[index].y * height)
    }
  }
  ctx.stroke()
}

function redraw() {
  const element = canvas.value
  const ctx = context()
  if (!element || !ctx) return
  const rect = element.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, element.width, element.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, element.width, element.height)
  setupContext(ctx)
  strokes.value.forEach((stroke) => drawStroke(ctx, stroke, rect.width, rect.height))
  if (activeStroke) drawStroke(ctx, activeStroke, rect.width, rect.height)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function pointFromEvent(event) {
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  }
}

function startStroke(event) {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault()
  activePointerId = event.pointerId
  activeStroke = [pointFromEvent(event)]
  canvas.value?.setPointerCapture?.(event.pointerId)
  redraw()
}

function continueStroke(event) {
  if (props.disabled || activePointerId !== event.pointerId || !activeStroke) return
  event.preventDefault()
  const events = event.getCoalescedEvents?.() || [event]
  events.forEach((item) => activeStroke.push(pointFromEvent(item)))
  redraw()
}

function finishStroke(event) {
  if (activePointerId !== event.pointerId || !activeStroke) return
  event.preventDefault()
  strokes.value.push(activeStroke)
  activeStroke = null
  activePointerId = null
  canvas.value?.releasePointerCapture?.(event.pointerId)
  redraw()
}

function clear() {
  if (props.disabled) return
  strokes.value = []
  activeStroke = null
  activePointerId = null
  redraw()
}

function undo() {
  if (props.disabled || !strokes.value.length) return
  strokes.value = strokes.value.slice(0, -1)
  redraw()
}

function isEmpty() {
  return strokes.value.length === 0 && !activeStroke
}

function toDataURL(type = 'image/png', quality) {
  redraw()
  return canvas.value?.toDataURL(type, quality) || ''
}

defineExpose({
  clear,
  undo,
  isEmpty,
  toDataURL,
  // Alias kontrak library yang dipakai SCC lama.
  clearCanvas: clear,
  isCanvasEmpty: isEmpty,
  saveSignature: toDataURL,
})

onMounted(async () => {
  await nextTick()
  resizeCanvas()
  resizeObserver = new ResizeObserver(resizeCanvas)
  resizeObserver.observe(canvas.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <canvas
    ref="canvas"
    class="block w-full rounded-lg bg-white touch-none"
    :class="disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair'"
    :style="{ height: `${height}px` }"
    aria-label="Area tanda tangan"
    @pointerdown="startStroke"
    @pointermove="continueStroke"
    @pointerup="finishStroke"
    @pointercancel="finishStroke"
    @pointerleave="finishStroke"
  />
</template>
