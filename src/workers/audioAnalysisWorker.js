/**
 * Audio Analysis Web Worker
 * Entlastet den Main Thread von FFT-Berechnungen
 */

// Gespeicherte geglättete Werte für Smoothing
let smoothBass = 0;
let smoothMid = 0;
let smoothTreble = 0;
let smoothVolume = 0;

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

  // Durchschnittswerte berechnen mit Verstärkung
  const bass = bassCount > 0 ? Math.min(255, Math.floor((bassSum / bassCount) * 1.5)) : 0;
  const mid = midCount > 0 ? Math.min(255, Math.floor((midSum / midCount) * 2.0)) : 0;

  // Treble mit Peak-Berücksichtigung
  const trebleAvg = trebleCount > 0 ? (trebleSum / trebleCount) : 0;
  const trebleCombined = (trebleAvg * 0.6) + (treblePeak * 0.4);
  const treble = Math.min(255, Math.floor(trebleCombined * 8.0));

  const volume = usableLength > 0 ? Math.min(255, Math.floor((totalSum / usableLength) * 1.5)) : 0;

  // Smoothing im Worker
  const smoothFactor = 0.4;
  const trebleSmoothFactor = 0.5;

  smoothBass = Math.floor(smoothBass * (1 - smoothFactor) + bass * smoothFactor);
  smoothMid = Math.floor(smoothMid * (1 - smoothFactor) + mid * smoothFactor);
  smoothTreble = Math.floor(smoothTreble * (1 - trebleSmoothFactor) + treble * trebleSmoothFactor);
  smoothVolume = Math.floor(smoothVolume * (1 - smoothFactor) + volume * smoothFactor);

  return {
    bass,
    mid,
    treble,
    volume,
    smoothBass,
    smoothMid,
    smoothTreble,
    smoothVolume
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
      self.postMessage({ type: 'reset', success: true });
      break;

    default:
      console.warn('[AudioWorker] Unknown message type:', type);
  }
};

// Worker ist bereit
self.postMessage({ type: 'ready' });
