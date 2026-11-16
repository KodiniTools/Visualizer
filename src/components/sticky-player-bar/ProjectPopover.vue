<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-project">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('project.title') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <UiTextField
      v-model="name"
      :label="t('project.name')"
      :placeholder="t('project.namePlaceholder')"
      maxlength="120"
      data-testid="project-name"
    />

    <div v-if="project.busy.value" class="project-busy" role="status">
      <span>{{ t(`project.busy.${project.busy.value}`) }}</span>
      <progress
        class="project-progress"
        max="1"
        :value="project.progress.value ?? undefined"
        :aria-label="t(`project.busy.${project.busy.value}`)"
      />
    </div>
    <UiCallout v-if="project.error.value" type="danger" data-testid="project-error">
      {{ t(`project.errors.${project.error.value}`) }}
    </UiCallout>

    <!-- Als Datei -->
    <section class="project-section" aria-labelledby="project-file-heading">
      <h3 id="project-file-heading" class="project-heading">{{ t('project.fileSection') }}</h3>
      <p class="project-hint">{{ t('project.fileHint') }}</p>
      <div class="project-actions">
        <UiButton
          variant="primary"
          size="sm"
          :disabled="isBusy"
          data-testid="project-save-file"
          @click="saveFile"
        >
          {{ t('project.saveFile') }}
        </UiButton>
        <UiButton size="sm" :disabled="isBusy" data-testid="project-open-file" @click="pickFile">
          {{ t('project.openFile') }}
        </UiButton>
        <input
          ref="fileInput"
          type="file"
          :accept="`.${PROJECT_EXTENSION}`"
          class="project-file-input"
          data-testid="project-file-input"
          @change="onFileChosen"
        />
      </div>
    </section>

    <!-- Auf dem Server (nur Admin) -->
    <section class="project-section" aria-labelledby="project-server-heading">
      <h3 id="project-server-heading" class="project-heading">
        {{ t('project.serverSection') }}
      </h3>

      <form v-if="!project.canUseServer.value" class="project-login" @submit.prevent="login">
        <p class="project-hint">{{ t('project.serverLoginHint') }}</p>
        <UiTextField
          v-model="password"
          type="password"
          :label="t('project.password')"
          :error="loginError"
          autocomplete="current-password"
        />
        <UiButton type="submit" size="sm" :disabled="!password || loggingIn">
          {{ t('project.login') }}
        </UiButton>
      </form>

      <template v-else>
        <p v-if="project.currentServerId.value" class="project-hint" data-testid="project-current">
          {{ t('project.current').replace('{name}', project.currentName.value) }}
        </p>
        <div class="project-actions">
          <UiButton
            v-if="project.currentServerId.value"
            variant="primary"
            size="sm"
            :disabled="isBusy"
            data-testid="project-save-server-overwrite"
            @click="saveServer(true)"
          >
            {{ t('project.saveServerOverwrite') }}
          </UiButton>
          <UiButton
            :variant="project.currentServerId.value ? 'secondary' : 'primary'"
            size="sm"
            :disabled="isBusy"
            data-testid="project-save-server"
            @click="saveServer(false)"
          >
            {{ t('project.saveServerNew') }}
          </UiButton>
        </div>

        <p v-if="!project.serverProjects.value.length" class="project-hint">
          {{ t('project.serverEmpty') }}
        </p>
        <ul v-else class="project-list" data-testid="project-list">
          <li v-for="item in project.serverProjects.value" :key="item.id" class="project-item">
            <div class="project-item-text">
              <span class="project-item-name">{{ item.name }}</span>
              <span class="project-item-meta">
                {{ formatDate(item.savedAt) }} · {{ formatSize(item.size) }}
              </span>
            </div>
            <UiButton size="sm" :disabled="isBusy" @click="askOpenServer(item)">
              {{ t('project.open') }}
            </UiButton>
            <UiIconButton
              size="sm"
              :label="t('project.delete')"
              :disabled="isBusy"
              @click="pendingDelete = item"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </UiIconButton>
          </li>
        </ul>
        <UiButton variant="ghost" size="sm" class="project-logout" @click="logout">
          {{ t('project.logout') }}
        </UiButton>
      </template>
    </section>

    <UiDialog
      :open="pendingOpen !== null"
      :title="t('project.confirmOpenTitle')"
      :description="t('project.confirmOpenText')"
      @close="pendingOpen = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="pendingOpen = null">{{ t('project.cancel') }}</UiButton>
        <UiButton variant="primary" data-testid="project-confirm-open" @click="confirmOpen">
          {{ t('project.confirm') }}
        </UiButton>
      </template>
    </UiDialog>

    <UiDialog
      :open="pendingDelete !== null"
      :title="t('project.confirmDeleteTitle')"
      :description="t('project.confirmDeleteText').replace('{name}', pendingDelete?.name ?? '')"
      @close="pendingDelete = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="pendingDelete = null">{{ t('project.cancel') }}</UiButton>
        <UiButton variant="danger" @click="confirmDelete">{{ t('project.delete') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import type { PlayerBarContext } from './playerBarContext'
import { useI18n } from '../../lib/i18n'
import { vPopoverDrag } from '../../directives/popoverDrag'
import { UiButton, UiCallout, UiDialog, UiIconButton, UiTextField } from '../ui'
import { useProject } from '../../composables/useProject'
import { PROJECT_EXTENSION } from '../../lib/project/projectArchive'
import type { ServerProject } from '../../lib/project/projectServerApi'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toastStore'

const { t, locale } = useI18n()
const { popover } = inject('playerBar') as PlayerBarContext
const close = () => popover.closePopover('project')
const initOffset = popover.cascadeOffset('project')

const project = useProject()
const auth = useAuthStore()
const toast = useToastStore()

const name = ref(project.currentName.value)
const password = ref('')
const loginError = ref<string | undefined>(undefined)
const loggingIn = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
/** Bestätigung ausstehend: Datei oder Server-Projekt */
const pendingOpen = ref<{ file: File } | { server: ServerProject } | null>(null)
const pendingDelete = ref<ServerProject | null>(null)

const isBusy = computed(() => project.busy.value !== null)
const projectName = () => name.value.trim() || t('project.namePlaceholder')

watch(project.currentName, (value) => {
  if (value) name.value = value
})

onMounted(() => {
  if (project.canUseServer.value) project.refreshServerList()
})

function notifySaved() {
  toast.success(t('project.saved'))
  if (project.missingCount.value > 0) {
    toast.warning(t('project.missing').replace('{count}', String(project.missingCount.value)))
  }
}

async function saveFile() {
  const result = await project.saveToFile(projectName())
  if (result === 'saved') notifySaved()
}

async function saveServer(overwrite: boolean) {
  const saved = await project.saveToServer(projectName(), { overwrite })
  if (saved) notifySaved()
}

function pickFile() {
  fileInput.value?.click()
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) pendingOpen.value = { file }
}

function askOpenServer(item: ServerProject) {
  pendingOpen.value = { server: item }
}

async function confirmOpen() {
  const target = pendingOpen.value
  pendingOpen.value = null
  if (!target) return
  const result =
    'file' in target
      ? await project.openFile(target.file)
      : await project.openFromServer(target.server)
  if (result) toast.success(t('project.loaded'))
}

async function confirmDelete() {
  const target = pendingDelete.value
  pendingDelete.value = null
  if (target) await project.deleteFromServer(target)
}

async function login() {
  loggingIn.value = true
  loginError.value = undefined
  try {
    const result = await auth.login(password.value)
    if (result.success && project.canUseServer.value) {
      password.value = ''
      await project.refreshServerList()
    } else {
      // Mock-Login (Backend nicht erreichbar) reicht für den Server nicht
      if (result.success) await auth.logout()
      loginError.value = t('project.loginFailed')
    }
  } finally {
    loggingIn.value = false
  }
}

async function logout() {
  await auth.logout()
  project.serverProjects.value = []
  project.currentServerId.value = null
}

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale.value === 'en' ? 'en-GB' : 'de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  const mb = bytes / 1024 ** 2
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.max(0.1, mb).toFixed(1)} MB`
}
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-project {
  width: 380px;
}
.project-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-border);
}
.project-heading {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}
.project-hint {
  margin: 0;
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
}
.project-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
.project-file-input {
  display: none;
}
.project-login {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  align-items: flex-start;
}
.project-login :deep(.ui-field) {
  align-self: stretch;
}
.project-busy {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  font-size: var(--ds-text-sm);
  color: var(--ds-text-2);
}
.project-progress {
  width: 100%;
  height: var(--ds-space-1);
  accent-color: var(--ds-accent);
}
.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}
.project-item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
  border-radius: var(--ds-radius-md);
  background-color: var(--ds-surface-2);
}
.project-item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.project-item-name {
  font-size: var(--ds-text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-item-meta {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
}
.project-logout {
  align-self: flex-start;
}
</style>
