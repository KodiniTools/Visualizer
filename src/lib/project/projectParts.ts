/**
 * 🧩 Projekt-Teile außerhalb des Undo-Verlaufs
 *
 * Der Undo-Verlauf (historyRecorder) erfasst bereits alle Einstellungen auf
 * dem Canvas und in den Panels. Was dort fehlt, weil es nicht rückgängig
 * gemacht wird – Bild- und Video-Galerie, Playlist –, meldet sich hier an.
 */

export interface ProjectPart<S = unknown> {
  /** Reihenfolge beim Laden (klein = zuerst, Standard 100) */
  order?: number
  /** JSON-fähiger Zustand; Medien als Data- oder Blob-URL */
  capture(): S
  /** stellt den Zustand wieder her (Medien-URLs sind frisch erzeugt) */
  apply(snapshot: S): void | Promise<void>
  /** bekannte Dateien je URL (spart beim Speichern das Nachladen) */
  blobs?(): Iterable<readonly [string, Blob]>
}

const DEFAULT_ORDER = 100

export function createProjectPartRegistry() {
  const parts = new Map<string, ProjectPart>()

  function register<S>(id: string, part: ProjectPart<S>): () => void {
    parts.set(id, part as ProjectPart)
    return () => {
      if (parts.get(id) === (part as ProjectPart)) parts.delete(id)
    }
  }

  function ordered(): [string, ProjectPart][] {
    return [...parts.entries()]
      .map((entry, index) => ({ entry, index }))
      .sort(
        (a, b) =>
          (a.entry[1].order ?? DEFAULT_ORDER) - (b.entry[1].order ?? DEFAULT_ORDER) ||
          a.index - b.index,
      )
      .map(({ entry }) => entry)
  }

  function captureAll(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [id, part] of ordered()) {
      try {
        out[id] = part.capture()
      } catch (error) {
        console.error(`❌ [Projekt] capture fehlgeschlagen (${id}):`, error)
      }
    }
    return out
  }

  /** @returns IDs der angewendeten Teile */
  async function applyAll(snapshots: Record<string, unknown>): Promise<string[]> {
    const applied: string[] = []
    for (const [id, part] of ordered()) {
      if (!Object.prototype.hasOwnProperty.call(snapshots, id)) continue
      try {
        await part.apply(snapshots[id])
        applied.push(id)
      } catch (error) {
        console.error(`❌ [Projekt] apply fehlgeschlagen (${id}):`, error)
      }
    }
    return applied
  }

  function knownBlobs(): Map<string, Blob> {
    const map = new Map<string, Blob>()
    for (const [, part] of ordered()) {
      for (const [url, blob] of part.blobs?.() ?? []) map.set(url, blob)
    }
    return map
  }

  return { register, captureAll, applyAll, knownBlobs, ids: () => [...parts.keys()] }
}

export type ProjectPartRegistry = ReturnType<typeof createProjectPartRegistry>

/** App-weite Instanz */
export const projectParts = createProjectPartRegistry()
