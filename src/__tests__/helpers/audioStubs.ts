import {
  setAudioAnalysisData as setAudioData,
  type AudioAnalysisData,
} from '../../lib/audio/audioAnalysisData'

/**
 * Wie setAudioAnalysisData, nimmt aber Teil-Daten an: Specs setzen nur die
 * Bänder, auf die der getestete Code reagiert.
 */
export const setAudioAnalysisData = (data: Partial<AudioAnalysisData> | null) =>
  setAudioData(data as AudioAnalysisData | null)
