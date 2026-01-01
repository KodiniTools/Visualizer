/**
 * Audio Analysis Web Worker
 * Entlastet den Main Thread von FFT-Berechnungen
 * ✨ NEU: Beat-Peak-Erkennung für dramatischere Effekte
 */

// Gespeicherte geglättete Werte für Smoothing
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let smoothVolume = 0;

// ✨ Beat-Detection State
let lastBassLevel = 0;
let lastBeatTime = 0;
let beatHistory = [];          // Letzte Beat-Intervalle für BPM-Schätzung
const BEAT_HISTORY_SIZE = 8;   // Anzahl der gespeicherten Intervalle
let averageBeatInterval = 500; // Durchschnittliches Beat-Intervall (ms)
let beatConfidence = 0;        // Wie sicher ist die Beat-Erkennung (0-1)

/**
 * Analysiert FFT-Daten und berechnet Frequenzbänder
 * @param {Uint8Array} audioDataArray - FFT-Daten vom Analyser
 * @param {number} bufferLength - Länge des Buffers
 * @returns {object} Berechnete Audio-Werte
 */
function analyzeAudioData(audioDataArray, bufferLength) {
  if (!audioDataArray || bufferLength === 0) {
    return null;
  }

  // Nur die unteren 50% der FFT-Daten sind relevant
  const usableLength = Math.floor(bufferLength * 0.5);

  // Frequenzbereiche (bei FFT-Size 2048, Sample Rate 44100Hz)
  const bassEnd = Math.floor(usableLength * 0.15);    // 0-15% = Sub-Bass + Bass
  const midEnd = Math.floor(usableLength * 0.35);     // 15-35% = Mitten

  let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;
  let treblePeak = 0;

  // Hauptschleife - optimiert für Worker
  for (let i = 0; i < usableLength; i++) {
    const value = audioDataArray[i];
    totalSum += value;

    if (i < bassEnd) {
      bassSum += value;
      bassCount++;
    } else if (i < midEnd) {
      midSum += value;
      midCount++;
    } else {
      trebleSum += value;
      trebleCount++;
      if (value > treblePeak) treblePeak = value;
    }
  }

  // Durchschnittswerte berechnen mit reduzierter Verstärkung (verhindert Übersteuerung)
  const bass = bassCount > 0 ? Math.min(255, Math.floor((bassSum / bassCount) * 1.0)) : 0;
  const mid = midCount > 0 ? Math.min(255, Math.floor((midSum / midCount) * 1.2)) : 0;

  // Treble mit Peak-Berücksichtigung (reduzierte Verstärkung)
  const trebleAvg = trebleCount > 0 ? (trebleSum / trebleCount) : 0;
  const trebleCombined = (trebleAvg * 0.6) + (treblePeak * 0.4);
  const treble = Math.min(255, Math.floor(trebleCombined * 3.0));

  const volume = usableLength > 0 ? Math.min(255, Math.floor((totalSum / usableLength) * 1.0)) : 0;

  // Smoothing im Worker
  const smoothFactor = 0.4;
  const trebleSmoothFactor = 0.5;

  smoothBass = Math.floor(smoothBass * (1 - smoothFactor) + bass * smoothFactor);
  smoothMid = Math.floor(smoothMid * (1 - smoothFactor) + mid * smoothFactor);
  smoothTreble = Math.floor(smoothTreble * (1 - trebleSmoothFactor) + treble * trebleSmoothFactor);
  smoothVolume = Math.floor(smoothVolume * (1 - smoothFactor) + volume * smoothFactor);

  // ✨ Beat-Detection: Erkennt starke Bass-Peaks
  const now = Date.now();
  const bassNormalized = bass / 255;
  const lastBassNormalized = lastBassLevel / 255;

  // Beat erkannt wenn: signifikanter Anstieg + über Schwellwert + Mindestabstand zum letzten Beat
  const beatThreshold = 0.45;          // Mindest-Level für Beat
  const beatRiseThreshold = 0.15;      // Mindest-Anstieg für Beat
  const minBeatInterval = 150;         // Mindestens 150ms zwischen Beats (max 400 BPM)

  const timeSinceLastBeat = now - lastBeatTime;
  const isRising = bassNormalized - lastBassNormalized > beatRiseThreshold;
  const isAboveThreshold = bassNormalized > beatThreshold;
  const hasMinInterval = timeSinceLastBeat > minBeatInterval;

  let isBeat = false;
  let beatIntensity = 0;

  if (isRising && isAboveThreshold && hasMinInterval) {
    isBeat = true;
    beatIntensity = Math.min(1, (bassNormalized - beatThreshold) / (1 - beatThreshold));

    // Beat-Intervall für BPM-Berechnung speichern
    if (lastBeatTime > 0 && timeSinceLastBeat < 2000) {
      beatHistory.push(timeSinceLastBeat);
      if (beatHistory.length > BEAT_HISTORY_SIZE) {
        beatHistory.shift();
      }

      // Durchschnittliches Intervall berechnen
      if (beatHistory.length >= 3) {
        const sum = beatHistory.reduce((a, b) => a + b, 0);
        averageBeatInterval = sum / beatHistory.length;

        // Confidence basierend auf Konsistenz der Intervalle
        const variance = beatHistory.reduce((sum, val) =>
          sum + Math.pow(val - averageBeatInterval, 2), 0) / beatHistory.length;
        const stdDev = Math.sqrt(variance);
        beatConfidence = Math.max(0, 1 - (stdDev / averageBeatInterval));
      }
    }

    lastBeatTime = now;
  }

  // Bass-Level für nächsten Frame speichern
  lastBassLevel = bass;

  // BPM berechnen (wenn genug Daten)
  const bpm = beatHistory.length >= 3 ? Math.round(60000 / averageBeatInterval) : 0;

  return {
    bass,
    mid,
    treble,
    volume,
    smoothBass,
    smoothMid,
    smoothTreble,
    smoothVolume,
    // ✨ NEU: Beat-Detection Daten
    isBeat,
    beatIntensity,
    timeSinceLastBeat,
    bpm,
    beatConfidence
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
      // Reset smoothed values
      smoothBass = 0;
      smoothMid = 0;
      smoothTreble = 0;
      smoothVolume = 0;
      // ✨ Reset Beat-Detection State
      lastBassLevel = 0;
      lastBeatTime = 0;
      beatHistory = [];
      averageBeatInterval = 500;
      beatConfidence = 0;
      self.postMessage({ type: 'reset', success: true });
      break;

    default:
      console.warn('[AudioWorker] Unknown message type:', type);
  }
};

// Worker ist bereit
self.postMessage({ type: 'ready' });
