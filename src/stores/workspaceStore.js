import { defineStore } from 'pinia';
import { ref } from 'vue';

// Diese Presets sind direkt aus deinem canvasManager.js übernommen.
// Sie hier zu haben, entkoppelt die UI von der Canvas-Logik.
const socialMediaPresets = {
  'tiktok': { name: 'TikTok (9:16)' },
  'instagram-story': { name: 'Instagram Story (9:16)' },
  'instagram-post': { name: 'Instagram Post (1:1)' },
  'instagram-reel': { name: 'Instagram Reel (9:16)' },
  'youtube-short': { name: 'YouTube Short (9:16)' },
  'youtube-video': { name: 'YouTube Video (16:9)' },
  'facebook-post': { name: 'Facebook Post (1.91:1)' },
  'twitter-video': { name: 'X/Twitter Video (16:9)' },
  'linkedin-video': { name: 'LinkedIn Video (16:9)' }
};

export const useWorkspaceStore = defineStore('workspace', () => {
  // Zustand (State)
  const presets = ref(socialMediaPresets);
  const selectedPresetKey = ref(null); // 'null' bedeutet "kein Preset ausgewählt"

  // Aktionen (Actions)
  // Diese Funktion wird nicht direkt aufgerufen, sondern durch v-model im Dropdown.
  function setPreset(key) {
    selectedPresetKey.value = key;
  }

  return {
    presets,
    selectedPresetKey,
    setPreset,
  };
});
