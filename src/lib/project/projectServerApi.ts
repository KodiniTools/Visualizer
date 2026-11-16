/**
 * ☁️ Projekt-Ablage auf dem Server (nur Admin, siehe server/routes/projects.js)
 *
 * Hoch- und Herunterladen per XMLHttpRequest, weil fetch keinen
 * Upload-Fortschritt meldet. Die Datei wird dabei nicht in den
 * Arbeitsspeicher kopiert (Blob als Body, Antwort als Blob).
 */

export interface ServerProject {
  id: string
  name: string
  savedAt: string
  size: number
}

export class ProjectServerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ProjectServerError'
  }
}

export interface ProjectServerOptions {
  apiBase: string
  token: () => string | null
  fetchImpl?: typeof fetch
  createXhr?: () => XMLHttpRequest
}

/** Fortschritt 0–1 (null = unbekannt) */
export type ProgressFn = (fraction: number | null) => void

function errorFromBody(status: number, body: unknown): ProjectServerError {
  const message =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `HTTP ${status}`
  return new ProjectServerError(message, status)
}

export function createProjectServerApi({
  apiBase,
  token,
  fetchImpl = (...args) => globalThis.fetch(...args),
  createXhr = () => new XMLHttpRequest(),
}: ProjectServerOptions) {
  const auth = (): Record<string, string> => {
    const value = token()
    return value ? { Authorization: `Bearer ${value}` } : {}
  }

  async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetchImpl(`${apiBase}${path}`, {
      ...init,
      headers: { ...auth(), ...(init.headers as Record<string, string> | undefined) },
    })
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    if (!response.ok) throw errorFromBody(response.status, body)
    return body as T
  }

  function request<T>(
    method: string,
    path: string,
    {
      body,
      onProgress,
      headers = {},
      responseType = 'json',
    }: {
      body?: Blob
      onProgress?: ProgressFn
      headers?: Record<string, string>
      responseType?: 'json' | 'blob'
    },
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = createXhr()
      xhr.open(method, `${apiBase}${path}`)
      xhr.responseType = responseType
      for (const [key, value] of Object.entries({ ...auth(), ...headers })) {
        xhr.setRequestHeader(key, value)
      }
      const report = (event: ProgressEvent) =>
        onProgress?.(event.lengthComputable && event.total > 0 ? event.loaded / event.total : null)
      if (body) xhr.upload.onprogress = report
      else xhr.onprogress = report
      xhr.onerror = () => reject(new ProjectServerError('Netzwerkfehler', 0))
      xhr.onabort = () => reject(new ProjectServerError('Abgebrochen', 0))
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response as T)
          return
        }
        let parsed: unknown = xhr.response
        if (parsed instanceof Blob) {
          try {
            parsed = JSON.parse(await parsed.text())
          } catch {
            parsed = null
          }
        }
        reject(errorFromBody(xhr.status, parsed))
      }
      xhr.send(body ?? null)
    })
  }

  return {
    async list(): Promise<ServerProject[]> {
      const body = await json<{ projects?: ServerProject[] }>('/projects')
      return Array.isArray(body?.projects) ? body.projects : []
    },

    /** Speichert neu (ohne id) oder überschreibt das Projekt mit dieser id. */
    async save(
      file: Blob,
      { name, id, onProgress }: { name: string; id?: string | null; onProgress?: ProgressFn },
    ): Promise<ServerProject> {
      const body = await request<{ project: ServerProject } | null>(
        id ? 'PUT' : 'POST',
        id ? `/projects/${encodeURIComponent(id)}` : '/projects',
        {
          body: file,
          onProgress,
          headers: {
            'Content-Type': 'application/x-visualizer-project',
            'X-Project-Name': encodeURIComponent(name),
          },
        },
      )
      if (!body?.project) throw new ProjectServerError('Leere Antwort', 500)
      return body.project
    },

    download(id: string, onProgress?: ProgressFn): Promise<Blob> {
      return request<Blob>('GET', `/projects/${encodeURIComponent(id)}/file`, {
        onProgress,
        responseType: 'blob',
      })
    },

    async remove(id: string): Promise<void> {
      await json(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}

export type ProjectServerApi = ReturnType<typeof createProjectServerApi>
