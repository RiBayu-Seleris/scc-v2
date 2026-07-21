<script setup>
/**
 * Input teks reusable dengan label & pesan error.
 * Mendukung v-model: <BaseInput v-model="email" label="Email" />
 *
 * Prop penting:
 *  - modelValue : nilai (dipakai v-model)
 *  - label      : teks label di atas input
 *  - type       : text | password | email | number | ...
 *  - error      : teks error (muncul merah di bawah input)
 */
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div>
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="form-input"
      :class="{ 'border-danger focus:border-danger focus:ring-danger/30': error }"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-else-if="hint" class="form-hint">{{ hint }}</p>
  </div>
</template>
