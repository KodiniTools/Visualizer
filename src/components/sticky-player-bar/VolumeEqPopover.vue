<template>
  <div v-popover-drag class="spb-popover spb-popover-volume">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openVolume') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="volume-section">
      <span class="section-label">{{ t('player.volume') }}: {{ volume }}%</span>
      <div class="volume-control">
        <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
          />
        </svg>
        <input
          v-model="volume"
          type="range"
          min="0"
          max="100"
          class="volume-slider"
          @input="updateVolume"
        />
      </div>
    </div>

    <div class="eq-section">
      <div class="eq-control">
        <span class="eq-label">{{ t('player.bass') }}: {{ bass > 0 ? '+' : '' }}{{ bass }} dB</span>
        <div class="eq-slider-container">
          <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
            />
          </svg>
          <input
            v-model="bass"
            type="range"
            min="-12"
            max="12"
            class="eq-slider"
            @input="updateBass"
          />
        </div>
      </div>
      <div class="eq-control">
        <span class="eq-label"
          >{{ t('player.treble') }}: {{ treble > 0 ? '+' : '' }}{{ treble }} dB</span
        >
        <div class="eq-slider-container">
          <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4c2.21 0 4-1.79 4-4V7h4V3H12zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
            />
          </svg>
          <input
            v-model="treble"
            type="range"
            min="-12"
            max="12"
            class="eq-slider"
            @input="updateTreble"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()

const { popover, volumeEq } = inject('playerBar')
const { closePopover } = popover
const { volume, bass, treble, updateVolume, updateBass, updateTreble } = volumeEq
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.volume-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
}
.volume-icon {
  width: 14px;
  height: 14px;
  color: var(--text-primary, #e9e9eb);
  flex-shrink: 0;
}
.volume-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #fff;
}
.eq-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eq-control {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.eq-label {
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
}
.eq-slider-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
}
.eq-icon {
  width: 12px;
  height: 12px;
  color: var(--text-primary, #e9e9eb);
  flex-shrink: 0;
}
.eq-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 50%,
    var(--accent-tertiary, #f8e1a9) 100%
  );
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.eq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
.eq-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: 2px solid #fff;
}
</style>
