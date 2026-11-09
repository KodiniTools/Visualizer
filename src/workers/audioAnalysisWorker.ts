/**
 * Audio Analysis Web Worker
 * Entlastet den Main Thread von FFT-Berechnungen
 * ✨ NEU: Verwendet modularisierte Audio-Verarbeitung
 */

import { FrequencyAnalyzer, type FrequencyAnalyzerConfig } from '../lib/audio/FrequencyAnalyzer'
import { BeatDetector, type BeatDetectorConfig } from '../lib/audio/BeatDetector'
import type { WorkerScope } from './workerScope'

/** Nachrichten vom Haupt-Thread (lib/workerManager) */
interface AudioWorkerMessage {
  type: string
  audioData?: ArrayLike<number> | null
  bufferLength?: number
  frequencyConfig?: Partial<FrequencyAnalyzerConfig>
  beatConfig?: Partial<BeatDetectorConfig>
}

const scope = self as unknown as WorkerScope<AudioWorkerMessage>

// Instanzen der modularen Klassen
const frequencyAnalyzer = new FrequencyAnalyzer()
const beatDetector = new BeatDetector()

/**
 * Analysiert FFT-Daten und berechnet Frequenzbänder
 * @param audioDataArray - FFT-Daten vom Analyser
 * @param bufferLength - Länge des Buffers
 * @returns Berechnete Audio-Werte
 */
function analyzeAudioData(
  audioDataArray: ArrayLike<number> | null | undefined,
  bufferLength: number,
) {
  // Frequenzanalyse durchführen
  const frequencyData = frequencyAnalyzer.analyze(audioDataArray, bufferLength)
  if (!frequencyData) {
    return null
  }

  // Beat-Detection auf Basis des Bass-Levels
  const beatData = beatDetector.detect(frequencyData.bass)

  // Kombinierte Ergebnisse zurückgeben
  return {
    ...frequencyData,
    ...beatData,
  }
}

// Message Handler
scope.onmessage = function (e) {
  const { type, audioData, bufferLength } = e.data

  switch (type) {
    case 'analyze': {
      const result = analyzeAudioData(audioData, bufferLength as number)
      if (result) {
        scope.postMessage({ type: 'audioData', data: result })
      }
      break
    }

    case 'reset':
      // Reset both analyzers
      frequencyAnalyzer.reset()
      beatDetector.reset()
      scope.postMessage({ type: 'reset', success: true })
      break

    case 'updateConfig':
      // Konfiguration aktualisieren
      if (e.data.frequencyConfig) {
        frequencyAnalyzer.updateConfig(e.data.frequencyConfig)
      }
      if (e.data.beatConfig) {
        beatDetector.updateConfig(e.data.beatConfig)
      }
      scope.postMessage({ type: 'configUpdated', success: true })
      break

    case 'getStats':
      // Statistiken abrufen
      scope.postMessage({
        type: 'stats',
        data: {
          frequency: frequencyAnalyzer.getSmoothedValues(),
          beat: beatDetector.getStats(),
        },
      })
      break

    default:
      console.warn('[AudioWorker] Unknown message type:', type)
  }
}

// Worker ist bereit
scope.postMessage({ type: 'ready' })
