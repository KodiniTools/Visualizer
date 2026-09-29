/**
 * Dauerhaftes Speichern der Visualizer-Einstellungen (localStorage).
 *
 * Gespeichert wird derselbe Snapshot wie im Undo-Verlauf (createVisualizerSegment):
 * gewählter Visualizer, Farbe, Intensität, Reaktion, Position/Größe, LED-Texte,
 * Multi-Layer und Post-Processing-Effekte. Bilder für Portrait-Visualizer sind
 * Sitzungsobjekte und werden nicht mitgespeichert (Bild-Verweis → null).
 *
 * Beim Laden wird jeder Wert geprüft: nur bekannte Einstellungen mit passendem
 * Typ, nur Visualizer-Typen, die es (ggf. über Alias) noch gibt – beschädigte
 * Daten fallen auf den Standard zurück.
 */
import { createVisualizerSegment } from './history/segments/storeSegments.js'
import { clone, isPlainObject, sanitizeLike } from './storePersistence.js'
import { resolveVisualizerId } from './visualizers/aliases.js'

export const VISUALIZER_STORAGE_KEY = 'visualizer-visualizer-settings'
const SAVE_DELAY_MS = 400

/** Bild-Verweise entfernen (Bilder überleben keinen Neustart). */
function withoutImages(snapshot) {
  const out = clone(snapshot)
  if ('visualizerImageId' in out) out.visualizerImageId = null
  if (Array.isArray(out.visualizerLayers)) {
    out.visualizerLayers = out.visualizerLayers.map((l) => ({ ...l, imageId: null }))
  }
  return out
}

/**
 * Prüft einen gespeicherten Snapshot gegen den aktuellen Store-Zustand.
 * @param {object} raw - gelesene Daten
 * @param {object} current - aktueller Snapshot (Standardwerte, Typ-Vorlage)
 * @param {object} [registry] - Visualizer-Registry (für Tests)
 * @returns {object} nur gültige Einstellungen
 */
export function sanitizeVisualizerSettings(raw, current, registry) {
  if (!isPlainObject(raw)) return {}
  const layersRaw = raw.visualizerLayers
  const out = sanitizeLike({ ...current, visualizerLayers: [] }, { ...raw, visualizerLayers: [] })

  // Gewählter Visualizer muss existieren (alte IDs über Alias)
  if ('selectedVisualizer' in out) {
    const id = resolveVisualizerId(out.selectedVisualizer, registry)
    if (id) out.selectedVisualizer = id
    else delete out.selectedVisualizer
  }

  // Layer: Vorlage = Standard-Layer (erster vorhandener oder übergebener)
  if (Array.isArray(layersRaw)) {
    const template = current.layerTemplate
    const layers = []
    for (const layer of layersRaw) {
      if (!isPlainObject(layer) || typeof layer.id !== 'string' || !layer.id) continue
      const visualizerId = resolveVisualizerId(layer.visualizerId, registry)
      if (!visualizerId) continue
      const clean = template
        ? { ...clone(template), ...sanitizeLike(template, layer) }
        : clone(layer)
      clean.id = layer.id
      clean.visualizerId = visualizerId
      clean.imageId = null
      layers.push(clean)
    }
    out.visualizerLayers = layers
  } else {
    delete out.visualizerLayers
  }

  if ('activeLayerId' in out && out.visualizerLayers) {
    if (!out.visualizerLayers.some((l) => l.id === out.activeLayerId)) {
      out.activeLayerId = out.visualizerLayers[0]?.id ?? null
    }
  }
  delete out.layerTemplate
  return out
}

/**
 * Lädt gespeicherte Einstellungen in den Store und speichert künftige Änderungen.
 * Vor dem Undo-Verlauf aufrufen, damit das Laden keinen Verlaufsschritt erzeugt.
 * @param {object} visualizerStore - Pinia-Store
 * @param {{ storage?: Storage, registry?: object }} [opts]
 * @returns {{ flush(): void, stop(): void }}
 */
export function setupVisualizerPersistence(visualizerStore, opts = {}) {
  const storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const segment = createVisualizerSegment(visualizerStore)

  // ── Laden ──
  try {
    const raw = JSON.parse(storage?.getItem(VISUALIZER_STORAGE_KEY) || 'null')
    if (raw) {
      const current = segment.capture()
      current.layerTemplate = visualizerStore.createLayer?.('bars') ?? null
      const clean = sanitizeVisualizerSettings(raw, current, opts.registry)
      if (Object.keys(clean).length) segment.apply(clean)
    }
  } catch (e) {
    console.warn('[VisualizerPersistence] Gespeicherte Einstellungen ungültig:', e)
  }

  // ── Speichern (gebündelt: Regler lösen viele Änderungen aus) ──
  let timer = null
  const save = () => {
    clearTimeout(timer)
    timer = null
    try {
      storage?.setItem(VISUALIZER_STORAGE_KEY, JSON.stringify(withoutImages(segment.capture())))
    } catch (e) {
      console.warn('[VisualizerPersistence] Speichern fehlgeschlagen:', e)
    }
  }
  // Spätestens SAVE_DELAY_MS nach der ersten Änderung speichern – der Timer wird
  // nicht verlängert, damit laufende Änderungen (Regler, Marker) das Speichern
  // nicht endlos aufschieben
  const schedule = () => {
    if (!timer) timer = setTimeout(save, SAVE_DELAY_MS)
  }
  const unsubscribe = visualizerStore.$subscribe(schedule, { detached: true, flush: 'sync' })
  const onPageHide = () => timer && save()
  if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide)

  return {
    flush: () => timer && save(),
    stop() {
      if (timer) save() // ausstehende Änderung nicht verlieren
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide)
    },
  }
}
