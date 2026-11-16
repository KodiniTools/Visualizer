import { ref, computed } from 'vue'
import { getHistoryRecorder } from '../lib/history/historyRecorder'
import { mediaRegistry } from '../lib/history/mediaRegistry'
import { projectParts } from '../lib/project/projectParts'
import { buildProjectFile, loadProjectFile, ProjectFormatError } from '../lib/project/projectFile'
import type { ProjectDeps } from '../lib/project/projectFile'
import { PROJECT_EXTENSION, PROJECT_MIME } from '../lib/project/projectArchive'
import {
  createProjectServerApi,
  ProjectServerError,
  type ServerProject,
} from '../lib/project/projectServerApi'
import {
  normalizeFilename,
  supportsSavePicker,
  triggerDownload,
  type SavePickerWindow,
} from '../lib/saveFile'
import { useHistoryStore } from '../stores/historyStore'
import { useAuthStore } from '../stores/auth'

export type ProjectBusy = 'save' | 'open' | 'upload' | 'download' | 'list' | null

/** Fehlerschlüssel (i18n project.errors.*) */
export type ProjectErrorKey =
  | 'notAProject'
  | 'corrupt'
  | 'newerVersion'
  | 'unauthorized'
  | 'tooLarge'
  | 'network'
  | 'unknown'

/** Name und Server-ID des zuletzt gespeicherten/geladenen Projekts (app-weit) */
const currentName = ref('')
const currentServerId = ref<string | null>(null)

function errorKey(error: unknown): ProjectErrorKey {
  if (error instanceof ProjectFormatError) {
    if (error.code === 'not-a-project') return 'notAProject'
    if (error.code === 'newer-version') return 'newerVersion'
    return 'corrupt'
  }
  if (error instanceof ProjectServerError) {
    if (error.status === 401) return 'unauthorized'
    if (error.status === 413) return 'tooLarge'
    if (error.status === 0) return 'network'
  }
  return 'unknown'
}

function createDeps(): ProjectDeps {
  const historyStore = useHistoryStore()
  return {
    recorder: getHistoryRecorder(historyStore),
    parts: projectParts,
    media: mediaRegistry,
    clearHistory: () => historyStore.clear(),
  }
}

/**
 * Projekt speichern/öffnen – als Datei und (nur Admin) auf dem Server.
 */
export function useProject() {
  const auth = useAuthStore()
  const busy = ref<ProjectBusy>(null)
  /** 0–1 oder null (unbekannt) */
  const progress = ref<number | null>(null)
  const error = ref<ProjectErrorKey | null>(null)
  /** Medien, die beim Speichern nicht mehr lesbar waren */
  const missingCount = ref(0)
  const serverProjects = ref<ServerProject[]>([])

  const server = createProjectServerApi({
    apiBase: auth.getApiBase(),
    token: () => auth.token,
  })

  const canUseServer = computed(
    () => auth.isAdmin && !String(auth.token ?? '').startsWith('mock-token-'),
  )

  async function run<T>(kind: Exclude<ProjectBusy, null>, fn: () => Promise<T>) {
    if (busy.value) return undefined
    busy.value = kind
    progress.value = null
    error.value = null
    try {
      return await fn()
    } catch (err) {
      console.error(`❌ [Projekt] ${kind} fehlgeschlagen:`, err)
      error.value = errorKey(err)
      return undefined
    } finally {
      busy.value = null
      progress.value = null
    }
  }

  async function build(name: string) {
    const { file, missing } = await buildProjectFile(createDeps(), { name })
    missingCount.value = missing.length
    return file
  }

  async function apply(file: Blob) {
    const result = await loadProjectFile(createDeps(), file)
    currentName.value = result.name
    return result
  }

  /**
   * Speichert als Datei. Aus einem Klick heraus aufrufen: der
   * Speichern-Dialog wird vor dem ersten await geöffnet.
   */
  function saveToFile(name: string, win: SavePickerWindow = globalThis as SavePickerWindow) {
    const filename = normalizeFilename(name || 'projekt', PROJECT_EXTENSION)
    const handlePromise = supportsSavePicker(win)
      ? (win.showSaveFilePicker as NonNullable<SavePickerWindow['showSaveFilePicker']>)({
          suggestedName: filename,
          types: [
            {
              description: 'Visualizer-Projekt',
              accept: { [PROJECT_MIME]: [`.${PROJECT_EXTENSION}`] },
            },
          ],
        }).catch((err: unknown) => {
          if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled' as const
          return null // Dialog nicht verfügbar → normaler Download
        })
      : Promise.resolve(null)

    return run('save', async () => {
      const handle = await handlePromise
      if (handle === 'cancelled') return 'cancelled' as const
      const file = await build(name)
      if (handle) {
        const writable = await handle.createWritable()
        try {
          await writable.write(file)
          await writable.close()
        } catch (err) {
          await Promise.resolve(writable.abort?.()).catch(() => {})
          throw err
        }
      } else {
        const url = URL.createObjectURL(file)
        triggerDownload(url, filename)
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      currentName.value = name
      return 'saved' as const
    })
  }

  function openFile(file: File) {
    return run('open', async () => {
      const result = await apply(file)
      currentServerId.value = null
      return result
    })
  }

  function refreshServerList() {
    if (!canUseServer.value) return Promise.resolve(undefined)
    return run('list', async () => {
      serverProjects.value = await server.list()
      return serverProjects.value
    })
  }

  /** Speichert auf dem Server; mit `overwrite` wird das geladene Projekt ersetzt. */
  function saveToServer(name: string, { overwrite = false }: { overwrite?: boolean } = {}) {
    return run('upload', async () => {
      const file = await build(name)
      const saved = await server.save(file, {
        name,
        id: overwrite ? currentServerId.value : null,
        onProgress: (f) => (progress.value = f),
      })
      currentServerId.value = saved.id
      currentName.value = saved.name
      serverProjects.value = [saved, ...serverProjects.value.filter((p) => p.id !== saved.id)]
      return saved
    })
  }

  function openFromServer(project: ServerProject) {
    return run('download', async () => {
      const file = await server.download(project.id, (f) => (progress.value = f))
      const result = await apply(file)
      currentServerId.value = project.id
      currentName.value = project.name
      return result
    })
  }

  async function deleteFromServer(project: ServerProject) {
    return run('list', async () => {
      await server.remove(project.id)
      serverProjects.value = serverProjects.value.filter((p) => p.id !== project.id)
      if (currentServerId.value === project.id) currentServerId.value = null
      return true
    })
  }

  return {
    busy,
    progress,
    error,
    missingCount,
    serverProjects,
    canUseServer,
    currentName,
    currentServerId,
    saveToFile,
    openFile,
    refreshServerList,
    saveToServer,
    openFromServer,
    deleteFromServer,
  }
}
