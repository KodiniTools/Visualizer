// src/stores/beatMarkerStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Beat-Drop Marker Store
 * Verwaltet Zeitmarker für automatische Effektwechsel während der Wiedergabe
 */
export const useBeatMarkerStore = defineStore('beatMarker', () => {
  // Alle Marker für den aktuellen Track
  const markers = ref([]);

  // ID-Counter für eindeutige Marker-IDs
  const nextId = ref(1);

  // Letzter ausgelöster Marker (verhindert Mehrfachauslösung)
  const lastTriggeredMarkerId = ref(null);

  // Toleranz in Sekunden für Marker-Erkennung
  const triggerTolerance = ref(0.15);

  // Marker aktiviert/deaktiviert
  const markersEnabled = ref(true);

  // Sortierte Marker nach Zeit
  const sortedMarkers = computed(() => {
    return [...markers.value].sort((a, b) => a.time - b.time);
  });

  // Anzahl der Marker
  const markerCount = computed(() => markers.value.length);

  /**
   * Fügt einen neuen Marker hinzu
   * @param {number} time - Zeitpunkt in Sekunden
   * @param {object} action - Aktion die ausgeführt werden soll
   * @param {string} label - Optionale Beschreibung
   */
  function addMarker(time, action = {}, label = '') {
    const marker = {
      id: nextId.value++,
      time: Math.round(time * 100) / 100, // Auf 2 Dezimalstellen runden
      action: {
        type: action.type || 'visualizer', // 'visualizer', 'color', 'effect', 'combined'
        visualizer: action.visualizer || null,
        color: action.color || null,
        opacity: action.opacity !== undefined ? action.opacity : null,
        ...action
      },
      label: label || `Drop ${markers.value.length + 1}`,
      triggered: false
    };

    markers.value.push(marker);
    console.log('🎯 [BeatMarker] Marker hinzugefügt:', marker);
    return marker;
  }

  /**
   * Entfernt einen Marker
   * @param {number} id - Marker-ID
   */
  function removeMarker(id) {
    const index = markers.value.findIndex(m => m.id === id);
    if (index !== -1) {
      const removed = markers.value.splice(index, 1)[0];
      console.log('🗑️ [BeatMarker] Marker entfernt:', removed);
    }
  }

  /**
   * Aktualisiert einen Marker
   * @param {number} id - Marker-ID
   * @param {object} updates - Zu aktualisierende Felder
   */
  function updateMarker(id, updates) {
    const marker = markers.value.find(m => m.id === id);
    if (marker) {
      Object.assign(marker, updates);
      if (updates.action) {
        Object.assign(marker.action, updates.action);
      }
      console.log('✏️ [BeatMarker] Marker aktualisiert:', marker);
    }
  }

  /**
   * Prüft ob ein Marker ausgelöst werden soll
   * @param {number} currentTime - Aktuelle Wiedergabezeit
   * @returns {object|null} - Ausgelöster Marker oder null
   */
  function checkTrigger(currentTime) {
    if (!markersEnabled.value) return null;

    for (const marker of markers.value) {
      // Prüfe ob Zeit innerhalb der Toleranz liegt
      const timeDiff = Math.abs(currentTime - marker.time);

      if (timeDiff <= triggerTolerance.value && marker.id !== lastTriggeredMarkerId.value) {
        lastTriggeredMarkerId.value = marker.id;
        marker.triggered = true;
        console.log('🎯 [BeatMarker] TRIGGER!', marker.label, 'bei', currentTime.toFixed(2) + 's');
        return marker;
      }
    }
    return null;
  }

  /**
   * Setzt alle Marker auf nicht-ausgelöst zurück (z.B. bei Seek)
   */
  function resetTriggers() {
    lastTriggeredMarkerId.value = null;
    markers.value.forEach(m => m.triggered = false);
    console.log('🔄 [BeatMarker] Trigger zurückgesetzt');
  }

  /**
   * Löscht alle Marker
   */
  function clearAllMarkers() {
    markers.value = [];
    nextId.value = 1;
    lastTriggeredMarkerId.value = null;
    console.log('🗑️ [BeatMarker] Alle Marker gelöscht');
  }

  /**
   * Findet den nächsten Marker ab einer bestimmten Zeit
   * @param {number} currentTime - Aktuelle Zeit
   * @returns {object|null} - Nächster Marker oder null
   */
  function getNextMarker(currentTime) {
    return sortedMarkers.value.find(m => m.time > currentTime) || null;
  }

  /**
   * Exportiert Marker als JSON (für Speichern/Laden)
   */
  function exportMarkers() {
    return JSON.stringify({
      markers: markers.value,
      nextId: nextId.value
    });
  }

  /**
   * Importiert Marker aus JSON
   * @param {string} json - JSON-String mit Markern
   */
  function importMarkers(json) {
    try {
      const data = JSON.parse(json);
      markers.value = data.markers || [];
      nextId.value = data.nextId || markers.value.length + 1;
      console.log('📥 [BeatMarker] Marker importiert:', markers.value.length);
    } catch (e) {
      console.error('❌ [BeatMarker] Import fehlgeschlagen:', e);
    }
  }

  /**
   * Togglet Marker-Aktivierung
   */
  function toggleEnabled() {
    markersEnabled.value = !markersEnabled.value;
    console.log('🎯 [BeatMarker] Marker', markersEnabled.value ? 'aktiviert' : 'deaktiviert');
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
    checkTrigger,
    resetTriggers,
    clearAllMarkers,
    getNextMarker,
    exportMarkers,
    importMarkers,
    toggleEnabled
  };
});
