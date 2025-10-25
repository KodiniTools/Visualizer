import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCanvasStore = defineStore('canvas', () => {
  const textManagerInstance = ref(null);
  const activeTextObject = ref(null);

  function setTextManager(instance) {
    textManagerInstance.value = instance;
  }

  function setActiveTextObject(obj) {
    activeTextObject.value = obj;
  }

  function addText(text) {
    if (textManagerInstance.value && text.trim()) {
      const newObj = textManagerInstance.value.add(text.trim());
      // Nach dem Hinzufügen, mache es zum aktiven Objekt
      setActiveTextObject(newObj);
    }
  }

  function updateActiveProperty(propertyPath, value) {
    if (!activeTextObject.value) return;
    const parts = propertyPath.split('.');
    let target = activeTextObject.value;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (target[k] == null || typeof target[k] !== 'object') target[k] = {};
      target = target[k];
    }
    target[parts[parts.length - 1]] = value;
    // sofort neu zeichnen (mehrere Fallbacks)
    const tm = textManagerInstance.value;
    tm?.requestRender?.() ||
    tm?.redrawCallback?.() ||
    tm?.canvas?.requestRenderAll?.() ||
    tm?.canvas?.renderAll?.();
  }

  return {
    textManagerInstance,
    activeTextObject,
    setTextManager,
    setActiveTextObject,
    addText,
    updateActiveProperty
  };
});


