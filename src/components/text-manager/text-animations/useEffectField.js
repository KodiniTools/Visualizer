/**
 * Setzt ein Feld des Animations-Objekts (z. B. `fade`) und meldet die Änderung.
 *
 * Die Controls in `text-animations/` bearbeiten das Effekt-Objekt direkt
 * (es ist reaktiver Teil des Text-Objekts bzw. der Neu-Text-Einstellungen).
 * Das Edit-Panel zeichnet nach `change` den Canvas neu; das Neu-Formular
 * braucht das nicht und hört nicht darauf.
 *
 * @param {import('vue').Ref<Record<string, unknown>>} effect Effekt-Objekt (defineModel)
 * @param {(event: 'change') => void} emit
 * @returns {(key: string, value: unknown) => void}
 */
export function useEffectField(effect, emit) {
  return (key, value) => {
    effect.value[key] = value
    emit('change')
  }
}
