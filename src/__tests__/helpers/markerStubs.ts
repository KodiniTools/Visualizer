/**
 * Gemeinsame Typen für die Beat-Marker-Specs: Canvas-Manager-Attrappe
 * (Hintergrund als Farbe oder Bild-/Video-Eintrag) und Video-Element.
 */
import type { Mock } from 'vitest'

/** Hintergrund-Eintrag der Canvas-Manager-Attrappe (Bild oder Video) */
export interface FakeBgEntry {
  imageObject?: unknown
  videoElement?: unknown
  fotoSettings: Record<string, unknown>
  loop?: boolean
}

/**
 * Hintergrund der Attrappe: Farbe (String), Eintrag oder leer. Die Felder des
 * Eintrags sind ohne Narrowing lesbar (bei einer Farbe sind sie undefined),
 * so prüfen die Specs `cm.background.imageObject` direkt.
 */
export type FakeBg = ((FakeBgEntry | string) & Partial<FakeBgEntry>) | null

/** Video-Element-Attrappe (jsdom spielt keine Videos ab) */
export interface FakeVideoEl {
  src: string
  paused: boolean
  muted: boolean
  loop: boolean
  currentTime: number
  load: Mock
  play: Mock
  pause: Mock
  onloadeddata?: (() => void) | null
  onended?: (() => void) | null
}
