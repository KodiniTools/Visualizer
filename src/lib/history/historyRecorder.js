/**
 * ↩️ History Recorder – globaler Undo/Redo über alle Panels
 *
 * Konzept: Snapshot-Segmente
 * - Jedes Panel ("Segment") registriert einen Adapter mit
 *     capture() → JSON-fähiger Snapshot der vom Nutzer editierbaren Einstellungen
 *     apply(snapshot) → stellt den Snapshot wieder her (darf async sein)
 * - Der Recorder hält pro Segment den zuletzt festgeschriebenen Snapshot
 *   (als JSON-String) als Baseline.
 * - checkpoint() vergleicht alle Segmente mit ihrer Baseline. Jede Abweichung
 *   wird als EIN Command im historyStore abgelegt (mehrere geänderte Segmente
 *   → ein gemeinsamer Schritt, z. B. beim Anwenden eines Presets).
 * - Checkpoints werden automatisch nach Nutzerinteraktionen (pointerup,
 *   change, keyup, drop, input) ausgelöst – entprellt und erst, wenn kein
 *   Zeiger/keine Taste mehr gedrückt ist. Ein Slider-Zug ist so ein Schritt.
 * - Asynchrone Aktionen (Bild geladen, Preset angewendet) rufen checkpoint()
 *   explizit auf, sobald sie fertig sind.
 *
 * Commands, die nicht vom Recorder stammen (z. B. closure-basierte Commands),
 * bleiben kompatibel: Nach deren Aufnahme sowie nach jedem Undo/Redo wird die
 * Baseline neu eingelesen, damit keine Doppel-Einträge entstehen.
 */

import { ref } from 'vue'

/**
 * Zählt jedes Anwenden eines Snapshots (Undo/Redo). Panels, die ihre UI
 * imperativ befüllen (z. B. Audio-Reaktiv-Regler), beobachten diesen Wert und
 * synchronisieren sich neu.
 */
export const historyApplyRevision = ref(0)

const DEFAULT_DELAY = 250
const INPUT_DELAY = 700
// Nach-Checkpoint für asynchron abgeschlossene Aktionen (Bild aus Datei/
// Galerie geladen, Video-Metadaten da), die nach dem Klick fertig werden.
const LATE_DELAY = 1200
const DEFAULT_ORDER = 100
// Ein "gedrückter" Zeiger/Taste ohne Loslassen-Event (Drag&Drop, Fokuswechsel)
// darf Checkpoints nicht dauerhaft blockieren.
const STALE_PRESS_MS = 10000

/**
 * @typedef {Object} SegmentAdapter
 * @property {string} [label] - i18n-Key oder Anzeigename für die Verlaufsliste
 * @property {number} [order] - Reihenfolge beim Anwenden (klein = zuerst, Standard 100)
 * @property {() => any} capture - liefert einen JSON-serialisierbaren Snapshot
 * @property {(snapshot: any) => (void|Promise<void>)} apply - stellt den Snapshot wieder her
 */

/**
 * @param {Object} deps
 * @param {Object} deps.historyStore - Pinia historyStore (addCommand/undo/redo, $onAction)
 * @param {(fn: Function, ms: number) => any} [deps.setTimer]
 * @param {(handle: any) => void} [deps.clearTimer]
 */
export function createHistoryRecorder({
  historyStore,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (handle) => clearTimeout(handle),
}) {
  /** @type {Map<string, SegmentAdapter>} */
  const segments = new Map()
  /** @type {Map<string, string>} */
  const baseline = new Map()

  let applying = 0
  let transactionDepth = 0
  let ownCommandInFlight = false
  let tokenCounter = 0
  let timer = null
  let lateTimer = null
  let interacted = false
  let lastPressAt = 0
  /** @type {Map<string, number>} Segmente, die vorübergehend ignoriert werden */
  const held = new Map()
  let pointersDown = 0
  let keysDown = 0
  let enabled = true

  function serialize(id) {
    const adapter = segments.get(id)
    if (!adapter) return undefined
    try {
      return JSON.stringify(adapter.capture() ?? null)
    } catch (error) {
      console.error(`❌ [History] capture fehlgeschlagen (${id}):`, error)
      return undefined
    }
  }

  /** Segment-IDs sortiert nach adapter.order (stabil zur Registrierung). */
  function orderedIds() {
    return [...segments.entries()]
      .map(([id, adapter], index) => ({ id, index, order: adapter.order ?? DEFAULT_ORDER }))
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .map((entry) => entry.id)
  }

  /** true, solange ein Zeiger/eine Taste gedrückt ist (mit Staleness-Schutz). */
  function isPressing() {
    if (pointersDown === 0 && keysDown === 0) return false
    if (Date.now() - lastPressAt > STALE_PRESS_MS) {
      pointersDown = 0
      keysDown = 0
      return false
    }
    return true
  }

  function isBlocked() {
    return !enabled || applying > 0 || historyStore.isUndoRedoInProgress
  }

  /**
   * Registriert ein Segment. Die aktuelle Situation wird zur Baseline.
   * @param {string} id
   * @param {SegmentAdapter} adapter
   * @returns {() => void} unregister
   */
  function registerSegment(id, adapter) {
    if (!adapter || typeof adapter.capture !== 'function' || typeof adapter.apply !== 'function') {
      throw new Error(`[History] Segment "${id}" braucht capture() und apply()`)
    }
    segments.set(id, adapter)
    const snap = serialize(id)
    if (snap !== undefined) baseline.set(id, snap)
    return () => {
      if (segments.get(id) === adapter) {
        segments.delete(id)
        baseline.delete(id)
      }
    }
  }

  /**
   * Liest die Baseline neu ein, ohne einen Verlaufsschritt anzulegen
   * (z. B. nach dem Laden gespeicherter Einstellungen beim Start).
   * @param {string[]} [ids] - nur diese Segmente; Standard: alle
   */
  function rebase(ids) {
    for (const id of ids ?? segments.keys()) {
      const snap = serialize(id)
      if (snap !== undefined) baseline.set(id, snap)
    }
  }

  async function applyChanges(changes, key) {
    applying++
    try {
      for (const change of changes) {
        const adapter = segments.get(change.id)
        if (!adapter) continue
        try {
          await adapter.apply(JSON.parse(change[key]))
        } catch (error) {
          console.error(`❌ [History] apply fehlgeschlagen (${change.id}):`, error)
        }
      }
    } finally {
      applying--
      historyApplyRevision.value++
    }
    // Adapter dürfen beim Wiederherstellen normalisieren – die tatsächliche
    // Situation ist die neue Baseline, sonst entstünden Phantom-Schritte.
    rebase()
  }

  /**
   * Vergleicht alle Segmente mit ihrer Baseline und legt bei Änderungen einen
   * Verlaufsschritt an.
   * @param {string} [name] - Anzeigename des Schritts
   * @returns {number|null} Token des angelegten Commands oder null
   */
  function checkpoint(name) {
    cancelScheduled()
    if (isBlocked()) return null

    const changes = []
    for (const id of orderedIds()) {
      if (held.has(id)) continue
      const after = serialize(id)
      if (after === undefined) continue
      const before = baseline.get(id)
      if (before === undefined) {
        baseline.set(id, after)
        continue
      }
      if (after !== before) changes.push({ id, before, after })
    }
    if (changes.length === 0) return null

    for (const change of changes) baseline.set(change.id, change.after)

    const ids = changes.map((c) => c.id)
    const labels = ids.map((id) => segments.get(id)?.label || id)
    const token = ++tokenCounter

    ownCommandInFlight = true
    try {
      historyStore.addCommand({
        name: name || ids.join(' + '),
        segments: ids,
        labels,
        token,
        timestamp: Date.now(),
        // Snapshots sind absolute Zustände → in beide Richtungen dieselbe
        // (Registrierungs-)Reihenfolge, z. B. Canvas-Format vor Hintergrund.
        undo: () => applyChanges(changes, 'before'),
        execute: () => applyChanges(changes, 'after'),
      })
    } finally {
      ownCommandInFlight = false
    }
    return token
  }

  function cancelScheduled() {
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
  }

  function cancelLate() {
    if (lateTimer !== null) {
      clearTimer(lateTimer)
      lateTimer = null
    }
  }

  function scheduleLateCheckpoint() {
    cancelLate()
    lateTimer = setTimer(() => {
      lateTimer = null
      if (isPressing() || transactionDepth > 0 || timer !== null) {
        scheduleLateCheckpoint()
        return
      }
      checkpoint()
    }, LATE_DELAY)
  }

  /**
   * Nimmt Segmente vorübergehend vom Vergleich aus (z. B. während eine
   * Wiedergabe Text-Deckkraft animiert). release() übernimmt den dann
   * aktuellen Stand als Baseline.
   * @param {string[]} ids
   * @returns {() => void} release
   */
  function hold(ids) {
    flush()
    for (const id of ids) held.set(id, (held.get(id) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      const toRebase = []
      for (const id of ids) {
        const count = (held.get(id) ?? 1) - 1
        if (count <= 0) {
          held.delete(id)
          toRebase.push(id)
        } else {
          held.set(id, count)
        }
      }
      if (toRebase.length) rebase(toRebase)
    }
  }

  /**
   * Entprellter Checkpoint. Solange ein Zeiger oder eine Taste gedrückt ist,
   * wird verschoben (ein Slider-Zug / gehaltene Pfeiltaste = ein Schritt).
   * @param {number} [delay]
   */
  function scheduleCheckpoint(delay = DEFAULT_DELAY) {
    cancelScheduled()
    scheduleLateCheckpoint()
    timer = setTimer(() => {
      timer = null
      if (isPressing() || transactionDepth > 0) {
        scheduleCheckpoint(delay)
        return
      }
      checkpoint()
    }, delay)
  }

  /** Führt einen ausstehenden Checkpoint sofort aus. */
  function flush() {
    if (timer === null) return
    cancelScheduled()
    if (transactionDepth === 0) checkpoint()
  }

  /**
   * Fasst alle Änderungen in fn zu einem Schritt zusammen.
   * @template T
   * @param {string} name
   * @param {() => T|Promise<T>} fn
   * @returns {Promise<T>}
   */
  async function transaction(name, fn) {
    // Offene Änderungen vorher festschreiben, damit sie nicht im
    // Transaktions-Schritt landen.
    flush()
    transactionDepth++
    try {
      return await fn()
    } finally {
      transactionDepth--
      if (transactionDepth === 0) checkpoint(name)
    }
  }

  /**
   * Führt eine programmgesteuerte Änderung aus, die NICHT im Verlauf landen
   * soll (z. B. Beat-Marker während der Wiedergabe, Visualizer-Fallback).
   * Offene Nutzer-Änderungen werden vorher festgeschrieben; danach wird die
   * Baseline übernommen. Gibt fn ein Promise zurück, wird nach dessen Ende
   * erneut übernommen (asynchron geladene Hintergründe).
   * @template T
   * @param {() => T} fn
   * @param {Object} [opts]
   * @param {number} [opts.settleMs] - zusätzlich nach dieser Zeit übernehmen
   *   (für callback-basiert nachgeladene Medien ohne Promise)
   * @returns {T}
   */
  function absorb(fn, { settleMs } = {}) {
    if (applying > 0) return fn()
    if (settleMs > 0) {
      setTimer(() => {
        if (applying > 0 || historyStore.isUndoRedoInProgress) return
        flush()
        rebase()
      }, settleMs)
    }
    flush()
    let result
    try {
      result = fn()
    } finally {
      rebase()
    }
    if (result && typeof result.then === 'function') {
      result.then(
        () => {
          if (applying === 0) rebase()
        },
        () => {
          if (applying === 0) rebase()
        },
      )
    }
    return result
  }

  // ── Kopplung an den historyStore ──────────────────────────────────────────
  const stopActionListener = historyStore.$onAction?.(({ name, after }) => {
    if (name === 'undo' || name === 'redo') {
      // Ungesicherte Änderung zuerst festschreiben: Strg+Z direkt nach einem
      // Slider-Zug macht genau diesen Zug rückgängig.
      flush()
      after(() => rebase())
    } else if (name === 'addCommand' && !ownCommandInFlight) {
      // Fremdes Command (closure-basiert): dessen Änderung ist bereits
      // passiert und eigenständig undo-fähig → nur Baseline nachziehen.
      after(() => rebase())
    } else if (name === 'clear') {
      after(() => rebase())
    }
  })

  // ── Interaktions-Tracking ─────────────────────────────────────────────────
  function isModifierKey(event) {
    return ['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)
  }

  function isUndoRedoKey(event) {
    const key = (event.key || '').toLowerCase()
    return (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')
  }

  // Bis zur ersten Nutzer-Eingabe gilt alles als Start-Initialisierung
  // (asynchron geladene Kachelbilder, Standard-Hintergrund, …).
  function markInteraction() {
    if (interacted) return
    interacted = true
    rebase()
  }

  const listeners = {
    pointerdown: () => {
      markInteraction()
      lastPressAt = Date.now()
      pointersDown++
      cancelScheduled()
    },
    pointerup: () => {
      pointersDown = Math.max(0, pointersDown - 1)
      scheduleCheckpoint()
    },
    pointercancel: () => {
      pointersDown = Math.max(0, pointersDown - 1)
      scheduleCheckpoint()
    },
    click: () => scheduleCheckpoint(),
    change: () => scheduleCheckpoint(),
    drop: () => scheduleCheckpoint(),
    input: () => scheduleCheckpoint(INPUT_DELAY),
    keydown: (event) => {
      markInteraction()
      if (event.repeat || isModifierKey(event) || isUndoRedoKey(event)) return
      lastPressAt = Date.now()
      keysDown++
    },
    keyup: (event) => {
      if (isModifierKey(event) || isUndoRedoKey(event)) return
      keysDown = Math.max(0, keysDown - 1)
      scheduleCheckpoint()
    },
    blur: () => {
      // Fenster verloren: gedrückte Zeiger/Tasten gelten als losgelassen.
      pointersDown = 0
      keysDown = 0
    },
  }

  let trackedTarget = null
  let trackedWindow = null

  /**
   * Hängt die Interaktions-Listener an (Capture-Phase, damit auch Events
   * erfasst werden, deren Propagation gestoppt wird).
   * @param {EventTarget} [target]
   * @param {EventTarget} [win]
   */
  function attach(target = globalThis.document, win = globalThis.window) {
    detach()
    if (!target) return
    trackedTarget = target
    for (const [type, fn] of Object.entries(listeners)) {
      if (type === 'blur') continue
      target.addEventListener(type, fn, true)
    }
    if (win) {
      trackedWindow = win
      win.addEventListener('blur', listeners.blur)
    }
  }

  function detach() {
    if (trackedTarget) {
      for (const [type, fn] of Object.entries(listeners)) {
        if (type === 'blur') continue
        trackedTarget.removeEventListener(type, fn, true)
      }
      trackedTarget = null
    }
    if (trackedWindow) {
      trackedWindow.removeEventListener('blur', listeners.blur)
      trackedWindow = null
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value)
    if (!enabled) {
      cancelScheduled()
      cancelLate()
    } else rebase()
  }

  function destroy() {
    detach()
    cancelScheduled()
    cancelLate()
    held.clear()
    stopActionListener?.()
    segments.clear()
    baseline.clear()
  }

  return {
    registerSegment,
    checkpoint,
    scheduleCheckpoint,
    flush,
    rebase,
    transaction,
    absorb,
    hold,
    attach,
    detach,
    setEnabled,
    destroy,
    /** @returns {boolean} true während ein Snapshot angewendet wird */
    isApplying: () => applying > 0,
    /** @returns {string[]} registrierte Segment-IDs */
    segmentIds: () => [...segments.keys()],
  }
}

let sharedRecorder = null

/**
 * App-weite Instanz (lazy). Braucht beim ersten Aufruf den historyStore.
 * @param {Object} [historyStore]
 */
export function getHistoryRecorder(historyStore) {
  if (!sharedRecorder) {
    if (!historyStore) throw new Error('[History] Recorder noch nicht initialisiert')
    sharedRecorder = createHistoryRecorder({ historyStore })
  }
  return sharedRecorder
}

/** Nur für Tests: setzt die App-weite Instanz zurück. */
export function resetHistoryRecorder() {
  sharedRecorder?.destroy()
  sharedRecorder = null
}
