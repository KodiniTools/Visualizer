import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/** localStorage-Schlüssel der dauerhaft gespeicherten Raster-Einstellungen. */
export const GRID_STORAGE_KEY = 'visualizer-grid-settings'

export interface GridSettings {
  isVisible: boolean
  gridSize: number
  gridColor: string
  gridOpacity: number
  snapToGrid: boolean
}

export const GRID_DEFAULTS: Readonly<GridSettings> = Object.freeze({
  isVisible: false,
  gridSize: 50,
  gridColor: '#333333', // Dunkelgrau für bessere Sichtbarkeit auf weißem Hintergrund
  gridOpacity: 0.6, // Deckkraft des Rasters (0.1..1)
  snapToGrid: false,
})

const clampOpacity = (v: number): number => Math.max(0.1, Math.min(1, v))

/**
 * Gespeicherte Einstellungen lesen; ungültige oder fehlende Werte fallen auf
 * den Standard zurück (beschädigter Speicher bricht den Start nicht ab).
 */
export function loadGridSettings(): GridSettings {
  const out: GridSettings = { ...GRID_DEFAULTS }
  let raw: Partial<Record<keyof GridSettings, unknown>> | null = null
  try {
    raw = JSON.parse(localStorage.getItem(GRID_STORAGE_KEY) || 'null')
  } catch {
    raw = null
  }
  if (!raw || typeof raw !== 'object') return out
  if (typeof raw.isVisible === 'boolean') out.isVisible = raw.isVisible
  if (typeof raw.snapToGrid === 'boolean') out.snapToGrid = raw.snapToGrid
  if (typeof raw.gridColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.gridColor)) {
    out.gridColor = raw.gridColor
  }
  if (typeof raw.gridOpacity === 'number' && Number.isFinite(raw.gridOpacity)) {
    out.gridOpacity = clampOpacity(raw.gridOpacity)
  }
  if (typeof raw.gridSize === 'number' && Number.isFinite(raw.gridSize)) {
    out.gridSize = Math.max(10, Math.min(200, raw.gridSize))
  }
  return out
}

export const useGridStore = defineStore('grid', () => {
  // Zustand (State) – dauerhaft gespeichert (localStorage)
  const saved = loadGridSettings()
  const isVisible = ref(saved.isVisible)
  const gridSize = ref(saved.gridSize)
  const gridColor = ref(saved.gridColor)
  const gridOpacity = ref(saved.gridOpacity)
  const snapToGrid = ref(saved.snapToGrid)

  // Jede Änderung speichern (Schalter, Farbe, Deckkraft, Rückgängig …)
  watch(
    () => ({
      isVisible: isVisible.value,
      gridSize: gridSize.value,
      gridColor: gridColor.value,
      gridOpacity: gridOpacity.value,
      snapToGrid: snapToGrid.value,
    }),
    (settings: GridSettings) => {
      try {
        localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(settings))
      } catch (e) {
        console.warn('[GridStore] Raster-Einstellungen nicht speicherbar:', e)
      }
    },
  )

  // Aktionen (Actions)
  function toggleGrid() {
    isVisible.value = !isVisible.value
    console.log(`Grid visibility set to: ${isVisible.value}`)
  }

  function setGridVisibility(visible: boolean) {
    isVisible.value = visible
  }

  function setSize(size: number) {
    gridSize.value = size
  }

  function setColor(color: string) {
    gridColor.value = color
  }

  /** Objekte beim Verschieben am Raster einrasten (wirkt nur bei sichtbarem Raster). */
  function setSnapToGrid(enabled: unknown) {
    snapToGrid.value = !!enabled
  }

  function setOpacity(opacity: number) {
    // Auf gültigen Bereich begrenzen (0.1..1)
    gridOpacity.value = clampOpacity(opacity)
  }

  return {
    isVisible,
    gridSize,
    gridColor,
    gridOpacity,
    snapToGrid,
    setSnapToGrid,
    toggleGrid,
    setGridVisibility,
    setSize,
    setColor,
    setOpacity,
  }
})
