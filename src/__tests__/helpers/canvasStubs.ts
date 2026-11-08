/**
 * Gemeinsame Typen für Canvas-Stubs in Specs (jsdom hat keinen 2D-Context).
 * Die Stubs selbst bleiben in den Specs; diese Typen machen sie an Stellen
 * einsetzbar, die einen echten Context bzw. Canvas erwarten.
 */

/** Protokollierter Aufruf: [Methodenname, ...Argumente] */
export type Call = unknown[]

/** Context-Stub, der alle Aufrufe in `calls` protokolliert */
export type RecordingCtx = CanvasRenderingContext2D & { calls: Call[] }

/** Canvas-Stub mit protokollierendem Context */
export type FakeCanvas = HTMLCanvasElement & { ctx: RecordingCtx }

/** Proxy-Ziel eines Context-Stubs */
export type StubTarget = Record<string | symbol, unknown>

/** Platzhalter für ein Bild (jsdom lädt keine Bilder; Tests vergleichen nur die Identität/Felder) */
export const fakeImage = (value: object = {}) => value as unknown as HTMLImageElement
