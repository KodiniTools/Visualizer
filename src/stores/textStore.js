// src/stores/textStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTextStore = defineStore('text', () => {
  const texts = ref([]);
  const selectedTextId = ref(null);

  const selectedText = computed(() => {
    return texts.value.find(t => t.id === selectedTextId.value) || null;
  });

  function addText(textProperties) {
    const newText = {
      id: Date.now(),
      content: 'Neuer Text',
      font: 'Arial',
      size: 50,
      color: '#FFFFFF',
      align: 'center',
      x: 50, // in %
      y: 50, // in %
      ...textProperties,
    };
    texts.value.push(newText);
    selectedTextId.value = newText.id;
  }

  function updateText(id, newProperties) {
    const index = texts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      texts.value[index] = { ...texts.value[index], ...newProperties };
    }
  }

  function removeText(id) {
    texts.value = texts.value.filter(t => t.id !== id);
    if (selectedTextId.value === id) {
      selectedTextId.value = null;
    }
  }

  function setSelectedText(id) {
    selectedTextId.value = id;
  }

  return {
    texts,
    selectedTextId,
    selectedText,
    addText,
    updateText,
    removeText,
    setSelectedText,
  };
});
