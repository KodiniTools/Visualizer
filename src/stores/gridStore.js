import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGridStore = defineStore('grid', () => {
  // Zustand (State)
  const isVisible = ref(false);
  const gridSize = ref(50);
  const gridColor = ref('#333333'); // Dunkelgrau für bessere Sichtbarkeit auf weißem Hintergrund
  const snapToGrid = ref(false);

  // Aktionen (Actions)
  function toggleGrid() {
    isVisible.value = !isVisible.value;
    console.log(`Grid visibility set to: ${isVisible.value}`);
  }

  function setGridVisibility(visible) {
    isVisible.value = visible;
  }

  function setSize(size) {
    console.log('[gridStore] setSize aufgerufen:', size);
    gridSize.value = size;
  }

  function setColor(color) {
    console.log('[gridStore] setColor aufgerufen:', color);
    gridColor.value = color;
  }

  return {
    isVisible,
    gridSize,
    gridColor,
    snapToGrid,
    toggleGrid,
    setGridVisibility,
    setSize,
    setColor,
  };
});
