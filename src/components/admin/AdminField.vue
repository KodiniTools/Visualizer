<template>
  <label class="admin-field">
    <span class="admin-field-label">{{ label }}</span>
    <textarea
      v-if="multiline"
      class="admin-input admin-textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      @input="onInput"
    ></textarea>
    <input
      v-else
      type="text"
      class="admin-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <span v-if="hint" class="admin-field-hint">{{ hint }}</span>
  </label>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  multiline: { type: Boolean, default: false },
  rows: { type: Number, default: 3 },
})

const emit = defineEmits(['update:modelValue', 'edit'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
  emit('edit')
}
</script>

<style scoped>
.admin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.admin-field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #f8e1a9);
}

.admin-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 8px;
  background: var(--secondary-bg, rgba(14, 28, 50, 0.6));
  color: var(--text-primary, #f9f2d5);
  font-family: var(--font-sans, 'Supreme', sans-serif);
  font-size: 0.9rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
}

.admin-textarea {
  resize: vertical;
  line-height: 1.5;
}

.admin-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.2);
}

.admin-input::placeholder {
  color: var(--text-muted, #7a8da0);
  opacity: 0.8;
}

.admin-field-hint {
  font-size: 0.75rem;
  color: var(--text-muted, #7a8da0);
}
</style>
