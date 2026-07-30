import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * tickerStore — Lauftext (Ticker): ein horizontal scrollendes Textband.
 *
 * Der Nutzer kann Buchstabengröße, Textfarbe, Hintergrundfarbe und dessen
 * Transparenz sowie die Laufgeschwindigkeit einstellen.
 */
export const useTickerStore = defineStore('ticker', () => {
  const enabled = ref(false)
  const text = ref('Willkommen beim KodiniTools Visualizer  •  ')
  const fontSize = ref(48) // px
  const color = ref('#ffffff') // Textfarbe
  const bgColor = ref('#000000') // Hintergrundfarbe des Bandes
  const bgOpacity = ref(70) // Transparenz des Hintergrunds (0–100 %)
  const speed = ref(120) // Laufgeschwindigkeit (px/Sekunde)
  const position = ref('bottom') // 'top' | 'bottom'

  return {
    enabled,
    text,
    fontSize,
    color,
    bgColor,
    bgOpacity,
    speed,
    position,
  }
})
