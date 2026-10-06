<template>
  <UiDialog :open="true" title="Admin-Login" @close="close">
    <form ref="formEl" class="login-form" @submit.prevent="handleLogin">
      <UiTextField
        id="admin-password"
        v-model="password"
        label="Passwort"
        type="password"
        autocomplete="current-password"
        :error="error || undefined"
        required
      />
      <div class="login-actions">
        <UiButton variant="secondary" @click="close">Abbrechen</UiButton>
        <UiButton variant="primary" type="submit" :disabled="loading">
          {{ loading ? '…' : 'Anmelden' }}
        </UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/auth'
import UiDialog from '../ui/UiDialog.vue'
import UiTextField from '../ui/UiTextField.vue'
import UiButton from '../ui/UiButton.vue'

const emit = defineEmits(['close', 'success'])

const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const loading = ref(false)
const formEl = ref(null)

onMounted(async () => {
  // Nach dem Fokus, den UiDialog beim Öffnen auf den Dialog setzt, ins Passwortfeld.
  await nextTick()
  formEl.value?.querySelector('input')?.focus()
})

function close() {
  emit('close')
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const result = await authStore.login(password.value)
    if (result.success) {
      password.value = ''
      emit('success')
      emit('close')
    } else {
      error.value = result.error || 'Anmeldung fehlgeschlagen'
    }
  } catch {
    error.value = 'Anmeldung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}

.login-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ds-space-2);
}
</style>
