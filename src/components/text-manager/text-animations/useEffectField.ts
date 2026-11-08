import type { Ref } from 'vue'

/**
 * Setzt ein Feld des Animations-Objekts (z. B. `fade`) und meldet die Änderung.
 *
 * Die Controls in `text-animations/` bearbeiten das Effekt-Objekt direkt
 * (es ist reaktiver Teil des Text-Objekts bzw. der Neu-Text-Einstellungen).
 * Das Edit-Panel zeichnet nach `change` den Canvas neu; das Neu-Formular
 * braucht das nicht und hört nicht darauf.
 *
 * @param effect Effekt-Objekt (defineModel)
 */
export function useEffectField<T extends object>(
  effect: Ref<T>,
  emit: (event: 'change') => void,
): (key: keyof T & string, value: unknown) => void {
  return (key, value) => {
    ;(effect.value as Record<string, unknown>)[key] = value
    emit('change')
  }
}
