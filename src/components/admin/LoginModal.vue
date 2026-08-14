<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Admin Login">
      <h3>🔐 Admin-Login</h3>
      <form @submit.prevent="handleLogin">
        <input
          ref="passwordInput"
          v-model="password"
          type="password"
          placeholder="Passwort"
          class="input-password"
          autocomplete="current-password"
        />
        <div v-if="error" class="error-message">{{ error }}</div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="close">Abbrechen</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '…' : 'Anmelden' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits(['close', 'success'])

const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const loading = ref(false)
const passwordInput = ref(null)

onMounted(async () => {
  await nextTick()
  passwordInput.value?.focus()
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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 12, 30, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-dialog {
  background: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 16px;
  padding: 28px;
  width: min(90vw, 360px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-dialog h3 {
  margin: 0 0 18px 0;
  color: var(--text-primary, #f9f2d5);
  font-size: 1.15rem;
}

.input-password {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 10px;
  background: var(--secondary-bg, rgba(14, 28, 50, 0.6));
  color: var(--text-primary, #f9f2d5);
  font-family: var(--font-sans, 'Supreme', sans-serif);
  font-size: 1rem;
  box-sizing: border-box;
  margin-bottom: 14px;
}

.input-password:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.2);
}

.error-message {
  color: var(--red, #ef4444);
  font-size: 0.85rem;
  margin-bottom: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: var(--font-sans, 'Supreme', sans-serif);
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  color: var(--text-secondary, #f8e1a9);
}

.btn-secondary:hover {
  border-color: var(--accent-primary, #c9984d);
}

.btn-primary {
  background: linear-gradient(135deg, #c9984d 0%, #f8e1a9 100%);
  border: none;
  color: #091428;
}

.btn-primary:hover {
  filter: brightness(1.05);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
