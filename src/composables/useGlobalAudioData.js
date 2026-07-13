import { workerManager } from '../lib/workerManager.js'
import { BeatDetector } from '../lib/audio/BeatDetector.js'

window.audioAnalysisData = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  smoothBass: 0,
  smoothMid: 0,
  smoothTreble: 0,
  smoothVolume: 0,
  // Beat info — consumed by audio-reactive images/backgrounds (beatBoost) and
  // the beat-drop/audio-fx renderers. Previously never populated here, which
  // silently disabled beatBoost everywhere.
  isBeat: false,
  beatIntensity: 0,
  bpm: 0,
  beatConfidence: 0,
}

// Beat detector for the main-thread fallback path (worker supplies its own).
const fallbackBeatDetector = new BeatDetector()

export function useGlobalAudioData() {
  let useAudioWorker = false

  function applyAudioData(data) {
    window.audioAnalysisData.bass = data.bass
    window.audioAnalysisData.mid = data.mid
    window.audioAnalysisData.treble = data.treble
    window.audioAnalysisData.volume = data.volume

    if (data.smoothBass !== undefined) {
      window.audioAnalysisData.smoothBass = data.smoothBass
      window.audioAnalysisData.smoothMid = data.smoothMid
      window.audioAnalysisData.smoothTreble = data.smoothTreble
      window.audioAnalysisData.smoothVolume = data.smoothVolume
    } else {
      const s = 0.4
      const ts = 0.5
      const d = window.audioAnalysisData
      d.smoothBass = Math.floor(d.smoothBass * (1 - s) + data.bass * s)
      d.smoothMid = Math.floor(d.smoothMid * (1 - s) + data.mid * s)
      d.smoothTreble = Math.floor(d.smoothTreble * (1 - ts) + data.treble * ts)
      d.smoothVolume = Math.floor(d.smoothVolume * (1 - s) + data.volume * s)
    }

    // Carry beat info through when present (worker result or fallback below).
    if (data.isBeat !== undefined) {
      const d = window.audioAnalysisData
      d.isBeat = data.isBeat
      d.beatIntensity = data.beatIntensity || 0
      d.bpm = data.bpm || 0
      d.beatConfidence = data.beatConfidence || 0
    }
  }

  function updateGlobalAudioDataFallback(audioDataArray, bufferLength) {
    const usableLength = Math.floor(bufferLength * 0.5)
    const bassEnd = Math.floor(usableLength * 0.15)
    const midEnd = Math.floor(usableLength * 0.35)

    let bassSum = 0,
      midSum = 0,
      trebleSum = 0,
      totalSum = 0
    let bassCount = 0,
      midCount = 0,
      trebleCount = 0,
      treblePeak = 0

    for (let i = 0; i < usableLength; i++) {
      const value = audioDataArray[i]
      totalSum += value
      if (i < bassEnd) {
        bassSum += value
        bassCount++
      } else if (i < midEnd) {
        midSum += value
        midCount++
      } else {
        trebleSum += value
        trebleCount++
        if (value > treblePeak) treblePeak = value
      }
    }

    const bass = bassCount > 0 ? Math.min(255, Math.floor((bassSum / bassCount) * 1.5)) : 0
    const mid = midCount > 0 ? Math.min(255, Math.floor((midSum / midCount) * 2.0)) : 0
    const trebleAvg = trebleCount > 0 ? trebleSum / trebleCount : 0
    const treble = Math.min(255, Math.floor((trebleAvg * 0.6 + treblePeak * 0.4) * 8.0))
    const volume = usableLength > 0 ? Math.min(255, Math.floor((totalSum / usableLength) * 1.5)) : 0

    // Beat detection on the bass band so beatBoost works without the worker.
    const beat = fallbackBeatDetector.detect(bass)

    applyAudioData({ bass, mid, treble, volume, ...beat })
  }

  function updateGlobalAudioData(audioDataArray, bufferLength) {
    if (!audioDataArray || bufferLength === 0) return
    if (useAudioWorker) {
      workerManager.analyzeAudio(audioDataArray, bufferLength)
      return
    }
    updateGlobalAudioDataFallback(audioDataArray, bufferLength)
  }

  async function init() {
    try {
      const workerStatus = await workerManager.initAll()
      useAudioWorker = workerStatus.audio
      if (useAudioWorker) {
        workerManager.onAudioData(applyAudioData)
        console.log('[AudioData] Audio Worker aktiviert')
      } else {
        console.log('[AudioData] Audio Worker nicht verfügbar - Fallback aktiv')
      }
      return workerStatus
    } catch (error) {
      console.warn('[AudioData] Worker-Initialisierung fehlgeschlagen:', error)
      return { audio: false }
    }
  }

  function terminate() {
    workerManager.terminate()
  }

  return { init, terminate, updateGlobalAudioData, applyAudioData }
}
