import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGridStore = defineStore('grid', () => {
  // Zustand (State)
  const isVisible = ref(false)
  const gridSize = ref(50)
  const gridColor = ref('#333333') // Dunkelgrau für bessere Sichtbarkeit auf weißem Hintergrund
  const gridOpacity = ref(0.6) // Deckkraft des Rasters (0..1)
  const snapToGrid = ref(false)

  // Aktionen (Actions)
  function toggleGrid() {
    isVisible.value = !isVisible.value
    console.log(`Grid visibility set to: ${isVisible.value}`)
  }

  function setGridVisibility(visible) {
    isVisible.value = visible
  }

  function setSize(size) {
    gridSize.value = size
  }

  function setColor(color) {
    gridColor.value = color
  }

  function setOpacity(opacity) {
    // Auf gültigen Bereich begrenzen (0.1..1)
    gridOpacity.value = Math.max(0.1, Math.min(1, opacity))
  }

  return {
    isVisible,
    gridSize,
    gridColor,
    gridOpacity,
    snapToGrid,
    toggleGrid,
    setGridVisibility,
    setSize,
    setColor,
    setOpacity,
  }
})
