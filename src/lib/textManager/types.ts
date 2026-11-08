/**
 * Typen der Text-Objekte auf dem Canvas und ihrer Audio-Effektwerte.
 *
 * @module textManager/types
 */
import type { TextAudioReactiveConfig } from '../audio/audioReactiveConfig'
import type { EffectValues } from '../audio/AudioReactiveEffects'
import type { AudioReactiveValues } from '../audio/audioReactiveEngine'

/** Gemeinsame Felder der zeitgesteuerten Text-Animationen */
export interface TimedTextAnimation {
  enabled?: boolean
  /** Dauer in ms */
  duration?: number
  /** Verzögerung vor Start in ms */
  startDelay?: number
  /** 'in' | 'out' | 'inOut' */
  direction?: string
  loop?: boolean
  loopDelay?: number
  permanent?: boolean
  displayDuration?: number | null
  /** 'linear' | 'ease' | 'easeIn' | 'easeOut' */
  easing?: string
}

export interface TypewriterAnimation extends TimedTextAnimation {
  /** ms pro Buchstabe */
  speed?: number
  showCursor?: boolean
  cursorChar?: string
}

export interface ScaleAnimation extends TimedTextAnimation {
  startScale?: number
  endScale?: number
}

export interface SlideAnimation extends TimedTextAnimation {
  /** 'left' | 'right' | 'top' | 'bottom' */
  from?: string
  /** Distanz in Prozent des Canvas */
  distance?: number
}

/** Laufzeit-Zustand der Animationen (nicht Teil der Einstellungen) */
export interface TextAnimationState {
  startTime: number | null
  isPlaying: boolean
  currentIndex: number
  fadeStartTime?: number | null
  fadePhase?: string | null
  scaleStartTime?: number | null
  slideStartTime?: number | null
}

/** Schlüssel der Startzeiten in TextAnimationState */
export type TimelineStateKey = 'fadeStartTime' | 'scaleStartTime' | 'slideStartTime'

export interface TextAnimation {
  /** 'none' | 'typewriter' | 'fade' | 'scale' */
  type?: string
  typewriter?: TypewriterAnimation
  fade?: TimedTextAnimation
  scale?: ScaleAnimation
  slide?: SlideAnimation
  _state?: TextAnimationState
}

export interface TextShadow {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface TextStroke {
  enabled: boolean
  color: string
  width: number
}

/** Text-Objekt auf dem Canvas */
export interface TextObject {
  id: number | string
  type: 'text'
  content: string
  relX: number
  relY: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  /** 0–100 % */
  opacity: number
  letterSpacing: number
  /** 100–300 % */
  lineHeightMultiplier: number
  shadow: TextShadow
  stroke: TextStroke
  rotation: number
  audioReactive: TextAudioReactiveConfig
  animation: TextAnimation
  /** vom Canvas entfernt, nur noch im Verzeichnis */
  offCanvas?: boolean
}

/** Text-spezifische Effektwerte zusätzlich zur gemeinsamen Engine */
export interface TextEffectValues extends EffectValues {
  opacity?: number
  letterSpacing?: number
  strokeWidth?: number
  strobeActive?: boolean
  redOffsetX?: number
  redOffsetY?: number
  blueOffsetX?: number
  blueOffsetY?: number
  glitchIntensity?: number
  rotateX?: number
  rotateY?: number
  perspective3dScale?: number
  perspective3dSkewX?: number
  perspective3dSkewY?: number
  waveAmplitude?: number
  waveFrequency?: number
  waveSpeed?: number
  waveEnabled?: boolean
  rotationAngle?: number
  stretchX?: number
  stretchY?: number
}

/** Ergebnis von getAudioReactiveValues() für Texte */
export type TextAudioReactiveValues = AudioReactiveValues<TextEffectValues>

/** Effekt-Map (nur gesetzt, wenn Effekte aktiv sind) */
export type TextEffectMap = Record<string, TextEffectValues>
