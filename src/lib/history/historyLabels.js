/**
 * Anzeigenamen für Verlaufsschritte (Tooltip der Undo/Redo-Knöpfe).
 *
 * - Recorder-Schritte tragen `segments` (IDs) → `history.segments.<id>`
 * - Closure-Commands wie `delete:text` → `history.actions.delete_text`
 * - Explizite Namen (`history.actions.<name>`) werden übersetzt, falls vorhanden
 */

/**
 * @param {(key: string) => string} t
 * @param {string} key
 * @returns {string|null} Übersetzung oder null, wenn der Key fehlt
 */
function tryTranslate(t, key) {
  const value = t(key)
  return typeof value === 'string' && value !== key ? value : null
}

/**
 * @param {{ name?: string, segments?: string[] }} command
 * @param {(key: string) => string} t
 * @returns {string}
 */
export function historyStepLabel(command, t) {
  if (!command) return ''
  const name = command.name || ''
  const actionKey = `history.actions.${name.replace(/[^a-zA-Z0-9]/g, '_')}`
  const action = name ? tryTranslate(t, actionKey) : null
  if (action) return action

  if (Array.isArray(command.segments) && command.segments.length > 0) {
    return command.segments.map((id) => tryTranslate(t, `history.segments.${id}`) || id).join(', ')
  }
  return name
}
