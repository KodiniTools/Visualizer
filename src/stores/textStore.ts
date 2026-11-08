// src/stores/textStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface StoredText {
  id: number
  content: string
  font: string
  size: number
  color: string
  align: string
  /** in % */
  x: number
  /** in % */
  y: number
  [key: string]: unknown
}

export const useTextStore = defineStore('text', () => {
  const texts = ref<StoredText[]>([])
  const selectedTextId = ref<number | null>(null)

  const selectedText = computed(() => {
    return texts.value.find((t) => t.id === selectedTextId.value) || null
  })

  function addText(textProperties?: Partial<StoredText>) {
    const newText: StoredText = {
      id: Date.now(),
      content: 'Neuer Text',
      font: 'Arial',
      size: 50,
      color: '#FFFFFF',
      align: 'center',
      x: 50, // in %
      y: 50, // in %
      ...textProperties,
    }
    texts.value.push(newText)
    selectedTextId.value = newText.id
  }

  function updateText(id: number, newProperties: Partial<StoredText>) {
    const index = texts.value.findIndex((t) => t.id === id)
    const current = texts.value[index]
    if (index !== -1 && current) {
      texts.value[index] = { ...current, ...newProperties }
    }
  }

  function removeText(id: number) {
    texts.value = texts.value.filter((t) => t.id !== id)
    if (selectedTextId.value === id) {
      selectedTextId.value = null
    }
  }

  function setSelectedText(id: number | null) {
    selectedTextId.value = id
  }

  return {
    texts,
    selectedTextId,
    selectedText,
    addText,
    updateText,
    removeText,
    setSelectedText,
  }
})
