import { ref } from 'vue'

export function useRecordingTimer() {
  const recordingStartTime = ref(null)
  const recordingElapsedAtPause = ref(0)
  const recordingDisplayTime = ref('00:00')
  let timerInterval = null

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function updateTimerDisplay() {
    if (!recordingStartTime.value) {
      recordingDisplayTime.value = '00:00'
      return
    }
    const elapsed = (Date.now() - recordingStartTime.value) / 1000 + recordingElapsedAtPause.value
    recordingDisplayTime.value = formatTime(elapsed)
  }

  function startTimer() {
    recordingStartTime.value = Date.now()
    recordingElapsedAtPause.value = 0
    updateTimerDisplay()
    timerInterval = setInterval(updateTimerDisplay, 100)
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    if (recordingStartTime.value) {
      recordingElapsedAtPause.value += (Date.now() - recordingStartTime.value) / 1000
      recordingStartTime.value = null
    }
  }

  function resumeTimer() {
    recordingStartTime.value = Date.now()
    timerInterval = setInterval(updateTimerDisplay, 100)
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    recordingStartTime.value = null
    recordingElapsedAtPause.value = 0
    recordingDisplayTime.value = '00:00'
  }

  function destroyTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  return { recordingDisplayTime, startTimer, pauseTimer, resumeTimer, stopTimer, destroyTimer }
}
