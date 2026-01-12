/**
 * Audio Analysis Web Worker
 * Entlastet den Main Thread von FFT-Berechnungen
 * ✨ NEU: Verwendet modularisierte Audio-Verarbeitung
 */

import { FrequencyAnalyzer } from '../lib/audio/FrequencyAnalyzer.js';
import { BeatDetector } from '../lib/audio/BeatDetector.js';

// Instanzen der modularen Klassen
const frequencyAnalyzer = new FrequencyAnalyzer();
const beatDetector = new BeatDetector();

/**
 * Analysiert FFT-Daten und berechnet Frequenzbänder
 * @param {Uint8Array} audioDataArray - FFT-Daten vom Analyser
 * @param {number} bufferLength - Länge des Buffers
 * @returns {object} Berechnete Audio-Werte
 */
function analyzeAudioData(audioDataArray, bufferLength) {
  // Frequenzanalyse durchführen
  const frequencyData = frequencyAnalyzer.analyze(audioDataArray, bufferLength);
  if (!frequencyData) {
    return null;
  }

  // Beat-Detection auf Basis des Bass-Levels
  const beatData = beatDetector.detect(frequencyData.bass);

  // Kombinierte Ergebnisse zurückgeben
  return {
    ...frequencyData,
    ...beatData
  };
}

// Message Handler
self.onmessage = function(e) {
  const { type, audioData, bufferLength } = e.data;

  switch (type) {
    case 'analyze':
      const result = analyzeAudioData(audioData, bufferLength);
      if (result) {
        self.postMessage({ type: 'audioData', data: result });
      }
      break;

    case 'reset':
      // Reset both analyzers
      frequencyAnalyzer.reset();
      beatDetector.reset();
      self.postMessage({ type: 'reset', success: true });
      break;

    case 'updateConfig':
      // Konfiguration aktualisieren
      if (e.data.frequencyConfig) {
        frequencyAnalyzer.updateConfig(e.data.frequencyConfig);
      }
      if (e.data.beatConfig) {
        beatDetector.updateConfig(e.data.beatConfig);
      }
      self.postMessage({ type: 'configUpdated', success: true });
      break;

    case 'getStats':
      // Statistiken abrufen
      self.postMessage({
        type: 'stats',
        data: {
          frequency: frequencyAnalyzer.getSmoothedValues(),
          beat: beatDetector.getStats()
        }
      });
      break;

    default:
      console.warn('[AudioWorker] Unknown message type:', type);
  }
};

// Worker ist bereit
self.postMessage({ type: 'ready' });
