// src/stores/beatMarkerStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** Aktion eines Markers ('visualizer', 'color', 'effect', 'combined' …) plus Zusatzfelder. */
export interface BeatMarkerAction {
  type: string
  visualizer: string | null
  color: string | null
  opacity: number | null
  textId?: number | string | null
  textLabel?: string | null
  [key: string]: unknown
}

export interface BeatMarker {
  id: number
  /** Zeitpunkt in Sekunden (2 Dezimalstellen) */
  time: number
  action: BeatMarkerAction
  label: string
  triggered: boolean
  [key: string]: unknown
}

/**
 * Beat-Drop Marker Store
 * Verwaltet Zeitmarker für automatische Effektwechsel während der Wiedergabe
 */
export const useBeatMarkerStore = defineStore('beatMarker', () => {
  // Alle Marker für den aktuellen Track
  const markers = ref<BeatMarker[]>([])

  // ID-Counter für eindeutige Marker-IDs
  const nextId = ref(1)

  // Letzter ausgelöster Marker (verhindert Mehrfachauslösung)
  const lastTriggeredMarkerId = ref<number | null>(null)

  // Toleranz in Sekunden für Marker-Erkennung
  const triggerTolerance = ref(0.15)

  // Marker aktiviert/deaktiviert
  const markersEnabled = ref(true)

  // Sortierte Marker nach Zeit
  const sortedMarkers = computed(() => {
    return [...markers.value].sort((a, b) => a.time - b.time)
  })

  // Anzahl der Marker
  const markerCount = computed(() => markers.value.length)

  /**
   * Fügt einen neuen Marker hinzu
   * @param time - Zeitpunkt in Sekunden
   * @param action - Aktion die ausgeführt werden soll
   * @param label - Optionale Beschreibung
   */
  function addMarker(time: number, action: Partial<BeatMarkerAction> = {}, label = ''): BeatMarker {
    const marker: BeatMarker = {
      id: nextId.value++,
      time: Math.round(time * 100) / 100, // Auf 2 Dezimalstellen runden
      action: {
        type: action.type || 'visualizer', // 'visualizer', 'color', 'effect', 'combined'
        visualizer: action.visualizer || null,
        color: action.color || null,
        opacity: action.opacity !== undefined ? action.opacity : null,
        ...action,
      },
      label: label || `Drop ${markers.value.length + 1}`,
      triggered: false,
    }

    markers.value.push(marker)
    console.log('🎯 [BeatMarker] Marker hinzugefügt:', marker)
    return marker
  }

  /**
   * Entfernt einen Marker
   * @param id - Marker-ID
   */
  function removeMarker(id: number) {
    const index = markers.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      const removed = markers.value.splice(index, 1)[0]
      console.log('🗑️ [BeatMarker] Marker entfernt:', removed)
    }
  }

  /**
   * Aktualisiert einen Marker
   * @param id - Marker-ID
   * @param updates - Zu aktualisierende Felder
   */
  function updateMarker(
    id: number,
    updates: Partial<Omit<BeatMarker, 'action'>> & { action?: Partial<BeatMarkerAction> },
  ) {
    const marker = markers.value.find((m) => m.id === id)
    if (marker) {
      Object.assign(marker, updates)
      if (updates.action) {
        Object.assign(marker.action, updates.action)
      }
      console.log('✏️ [BeatMarker] Marker aktualisiert:', marker)
    }
  }

  /**
   * Entfernt die Text-Zuweisung aller Marker, die den Text verwenden (z.B.
   * nachdem er endgültig aus dem Text-Verzeichnis gelöscht wurde).
   * @returns Anzahl der zurückgesetzten Marker
   */
  function clearTextReference(textId: number | string | null | undefined): number {
    if (textId === undefined || textId === null || textId === '') return 0
    let count = 0
    for (const marker of markers.value) {
      if (marker.action?.textId !== textId) continue
      marker.action.textId = null
      marker.action.textLabel = null
      count++
    }
    return count
  }

  /**
   * Prüft ob ein Marker ausgelöst werden soll
   * @param currentTime - Aktuelle Wiedergabezeit
   * @returns Ausgelöster Marker oder null
   */
  function checkTrigger(currentTime: number): BeatMarker | null {
    if (!markersEnabled.value) return null

    for (const marker of markers.value) {
      // Prüfe ob Zeit innerhalb der Toleranz liegt
      const timeDiff = Math.abs(currentTime - marker.time)

      if (
        timeDiff <= triggerTolerance.value &&
        !marker.triggered &&
        marker.id !== lastTriggeredMarkerId.value
      ) {
        lastTriggeredMarkerId.value = marker.id
        marker.triggered = true
        console.log('🎯 [BeatMarker] TRIGGER!', marker.label, 'bei', currentTime.toFixed(2) + 's')
        return marker
      }
    }
    return null
  }

  /**
   * Frame-genaue Prüfung: liefert alle noch nicht ausgelösten Marker, deren
   * Zeit im Intervall (prevTime, currentTime] liegt – also zwischen zwei
   * Frames überschritten wurde. Unabhängig von der Toleranz, damit ein Marker
   * exakt beim Überschreiten seiner Zeit feuert (Hundertstel-genau).
   * @param prevTime - Position beim vorherigen Frame
   * @param currentTime - Position beim aktuellen Frame
   * @returns Ausgelöste Marker, nach Zeit sortiert (ggf. leer)
   */
  function checkCrossing(prevTime: number, currentTime: number): BeatMarker[] {
    if (!markersEnabled.value || !(currentTime > prevTime)) return []

    const crossed = sortedMarkers.value.filter(
      (m) => !m.triggered && m.time > prevTime && m.time <= currentTime,
    )
    for (const marker of crossed) {
      marker.triggered = true
      lastTriggeredMarkerId.value = marker.id
      console.log(
        '🎯 [BeatMarker] TRIGGER (Frame)!',
        marker.label,
        'bei',
        currentTime.toFixed(3) + 's',
        '(Marker ' + marker.time.toFixed(2) + 's)',
      )
    }
    return crossed
  }

  /**
   * Setzt alle Marker auf nicht-ausgelöst zurück (z.B. bei Seek)
   */
  function resetTriggers() {
    lastTriggeredMarkerId.value = null
    markers.value.forEach((m) => (m.triggered = false))
    console.log('🔄 [BeatMarker] Trigger zurückgesetzt')
  }

  /**
   * Löscht alle Marker
   */
  function clearAllMarkers() {
    markers.value = []
    nextId.value = 1
    lastTriggeredMarkerId.value = null
    console.log('🗑️ [BeatMarker] Alle Marker gelöscht')
  }

  /**
   * Findet den nächsten Marker ab einer bestimmten Zeit
   * @param currentTime - Aktuelle Zeit
   * @returns Nächster Marker oder null
   */
  function getNextMarker(currentTime: number): BeatMarker | null {
    return sortedMarkers.value.find((m) => m.time > currentTime) || null
  }

  /**
   * Exportiert Marker als JSON (für Speichern/Laden)
   */
  function exportMarkers() {
    return JSON.stringify({
      markers: markers.value,
      nextId: nextId.value,
    })
  }

  /**
   * Importiert Marker aus JSON
   * @param json - JSON-String mit Markern
   */
  function importMarkers(json: string) {
    try {
      const data = JSON.parse(json)
      markers.value = data.markers || []
      nextId.value = data.nextId || markers.value.length + 1
      console.log('📥 [BeatMarker] Marker importiert:', markers.value.length)
    } catch (e) {
      console.error('❌ [BeatMarker] Import fehlgeschlagen:', e)
    }
  }

  /**
   * Stellt eine Marker-Liste wieder her (Undo/Redo). `nextId` wird nie
   * gesenkt, damit neue Marker keine IDs bereits vergebener Marker erhalten.
   */
  function restoreMarkers(list: BeatMarker[] | null | undefined) {
    markers.value = Array.isArray(list) ? list : []
    const maxId = markers.value.reduce((max, m) => (m.id > max ? m.id : max), 0)
    nextId.value = Math.max(nextId.value, maxId + 1)
    if (!markers.value.some((m) => m.id === lastTriggeredMarkerId.value)) {
      lastTriggeredMarkerId.value = null
    }
  }

  /**
   * Togglet Marker-Aktivierung
   */
  function toggleEnabled() {
    markersEnabled.value = !markersEnabled.value
    console.log('🎯 [BeatMarker] Marker', markersEnabled.value ? 'aktiviert' : 'deaktiviert')
  }

  return {
    // State
    markers,
    markersEnabled,
    triggerTolerance,

    // Computed
    sortedMarkers,
    markerCount,

    // Actions
    addMarker,
    removeMarker,
    updateMarker,
    clearTextReference,
    checkTrigger,
    checkCrossing,
    resetTriggers,
    clearAllMarkers,
    getNextMarker,
    exportMarkers,
    importMarkers,
    restoreMarkers,
    toggleEnabled,
  }
})
