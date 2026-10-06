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
  color: var(--text-secondary);
}

.admin-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--secondary-bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
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
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.2);
}

.admin-input::placeholder {
  color: var(--text-muted);
  opacity: 0.8;
}

.admin-field-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
