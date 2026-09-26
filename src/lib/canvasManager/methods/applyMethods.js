// canvasManager/methods/applyMethods.js

/**
 * Überträgt die Methoden (und Getter) von Methoden-Klassen auf eine Ziel-Klasse –
 * mit denselben Property-Deskriptoren wie bei einer direkten Definition in der
 * Klasse (nicht aufzählbar, überschreibbar). `this` ist in allen Methoden die
 * Instanz der Ziel-Klasse.
 *
 * Doppelt vergebene Namen sind ein Programmierfehler und werfen sofort.
 * @param {Function} Target - Ziel-Klasse (z. B. CanvasManager)
 * @param {...Function} sources - Methoden-Klassen
 */
export function applyMethods(Target, ...sources) {
  for (const Source of sources) {
    const descriptors = Object.getOwnPropertyDescriptors(Source.prototype)
    for (const [name, descriptor] of Object.entries(descriptors)) {
      if (name === 'constructor') continue
      if (Object.prototype.hasOwnProperty.call(Target.prototype, name)) {
        throw new Error(`${Target.name}: „${name}“ ist mehrfach definiert (${Source.name})`)
      }
      Object.defineProperty(Target.prototype, name, descriptor)
    }
  }
}
