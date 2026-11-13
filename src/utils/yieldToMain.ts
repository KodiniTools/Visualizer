/**
 * Gibt den Main-Thread kurz frei, damit der Browser zwischen zwei Arbeitsblöcken
 * rendern und Eingaben verarbeiten kann. Teilt so einen langen Task in mehrere
 * kurze (senkt Total Blocking Time / verbessert INP).
 *
 * Nutzt `scheduler.yield()` (Fortsetzung mit Vorrang), sonst `setTimeout(0)`.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (typeof scheduler?.yield === 'function') return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}
