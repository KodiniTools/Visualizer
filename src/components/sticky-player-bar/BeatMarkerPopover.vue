<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-markers">
    <div class="spb-popover-header">
      <span class="section-label"
        >{{ t('player.beatMarkers') }} ({{ beatMarkerStore.markerCount }})</span
      >
      <div class="marker-controls">
        <button
          class="btn-toggle"
          :class="{ active: beatMarkerStore.markersEnabled }"
          :title="
            beatMarkerStore.markersEnabled ? t('player.disableMarkers') : t('player.enableMarkers')
          "
          @click="beatMarkerStore.toggleEnabled()"
        >
          {{
            beatMarkerStore.markersEnabled
              ? locale === 'de'
                ? 'AN'
                : 'ON'
              : locale === 'de'
                ? 'AUS'
                : 'OFF'
          }}
        </button>
        <button
          class="btn-toggle"
          :class="{ active: showMarkerPanel }"
          :title="t('player.beatMarker')"
          @click="addMarkerAtCurrentTime"
        >
          +
        </button>
        <button
          v-if="beatMarkerStore.markerCount > 0"
          class="btn-clear-markers"
          :title="t('player.deleteAllMarkers')"
          @click="clearAllMarkers"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
        <button class="spb-popover-close" :title="t('common.close')" @click="close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add/Edit Marker Form -->
    <div v-if="showMarkerPanel" class="marker-add-form">
      <div class="form-title">
        {{ editingMarkerId !== null ? t('player.editMarkerTitle') : t('player.addMarkerTitle') }}
      </div>
      <div class="form-row">
        <label>{{ t('player.time') }}:</label>
        <div class="time-input-wrapper">
          <input
            v-model="pendingMarkerTimeInput"
            type="text"
            class="marker-time-input"
            :placeholder="locale === 'de' ? 'z.B. 1:30' : 'e.g. 1:30'"
            @blur="updateMarkerTimeFromInput"
            @keyup.enter="updateMarkerTimeFromInput"
          />
          <span class="time-hint">{{
            locale === 'de' ? '(MM:SS oder Sek.)' : '(MM:SS or sec.)'
          }}</span>
          <span class="time-max">/ {{ formatTime(playerStore.duration) }}</span>
        </div>
      </div>
      <div class="form-row">
        <label>{{ t('player.visualizer') }}:</label>
        <select v-model="newMarkerVisualizer" class="marker-select">
          <option value="">{{ t('player.noChange') }}</option>
          <optgroup
            v-for="(items, category) in visualizerStore.categorizedVisualizers"
            :key="category"
            :label="category"
          >
            <option v-for="viz in items" :key="viz.id" :value="viz.id">{{ viz.name }}</option>
          </optgroup>
        </select>
      </div>
      <div class="form-row">
        <label>{{ t('player.color') }}:</label>
        <div class="color-input-wrapper">
          <input v-model="newMarkerColor" type="color" class="marker-color" />
          <label class="color-checkbox">
            <input v-model="newMarkerChangeColor" type="checkbox" />
            <span>{{ t('player.change') }}</span>
          </label>
        </div>
      </div>
      <div class="form-row">
        <label>{{ t('player.label') }}:</label>
        <input
          v-model="newMarkerLabel"
          type="text"
          :placeholder="locale === 'de' ? 'z.B. Bass Drop' : 'e.g. Bass Drop'"
          class="marker-input"
        />
      </div>
      <div class="form-buttons">
        <button class="btn-confirm" @click="confirmAddMarker">
          {{ editingMarkerId !== null ? t('common.save') : t('common.add') }}
        </button>
        <button class="btn-cancel" @click="cancelAddMarker">{{ t('common.cancel') }}</button>
      </div>
    </div>

    <!-- Marker List -->
    <ul v-if="beatMarkerStore.markerCount > 0" class="marker-list">
      <li
        v-for="marker in beatMarkerStore.sortedMarkers"
        :key="marker.id"
        class="marker-item"
        :class="{ triggered: marker.triggered, editing: editingMarkerId === marker.id }"
      >
        <span class="marker-time" @click="seekToMarker(marker.time)">{{
          formatTime(marker.time)
        }}</span>
        <span
          class="marker-label"
          :title="t('player.editMarker')"
          @click="startEditMarker(marker)"
          >{{ marker.label }}</span
        >
        <span v-if="marker.action.visualizer" class="marker-action">{{
          getVisualizerName(marker.action.visualizer)
        }}</span>
        <div class="marker-buttons">
          <button
            class="btn-edit-marker"
            :title="t('player.editMarker')"
            @click="startEditMarker(marker)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
          </button>
          <button
            class="btn-delete-marker"
            :title="t('common.delete')"
            @click="removeMarker(marker.id)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="spb-empty-hint">{{ t('player.addMarkerTitle') }}</p>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { formatTime } from '../../utils/formatTime.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t, locale } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const visualizerStore = useVisualizerStore()

const { popover, markers } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('markers')
const initOffset = cascadeOffset('markers')
const {
  showMarkerPanel,
  editingMarkerId,
  pendingMarkerTimeInput,
  newMarkerVisualizer,
  newMarkerColor,
  newMarkerChangeColor,
  newMarkerLabel,
  updateMarkerTimeFromInput,
  addMarkerAtCurrentTime,
  startEditMarker,
  confirmAddMarker,
  cancelAddMarker,
  seekToMarker,
  removeMarker,
  clearAllMarkers,
  getVisualizerName,
} = markers
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.btn-toggle {
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 22px;
}
.btn-toggle.active {
  background-color: #4ade80;
  border-color: #4ade80;
  color: var(--accent-text);
}
.marker-add-form {
  background-color: var(--secondary-bg);
  border-radius: 4px;
  padding: 8px;
  border: 1px solid var(--accent-primary);
}
.form-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.form-row label {
  font-size: 10px;
  color: var(--text-muted);
  min-width: 55px;
}
.marker-select,
.marker-input {
  flex: 1;
  padding: 4px 6px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
}
.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.marker-color {
  width: 28px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}
.color-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
}
.color-checkbox input {
  width: 12px;
  height: 12px;
}
.time-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.marker-time-input {
  width: 60px;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  background-color: var(--secondary-bg);
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  color: var(--accent-primary);
  text-align: center;
}
.time-hint {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
}
.time-max {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}
.form-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn-confirm {
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 600;
  background-color: #4ade80;
  border: none;
  border-radius: 4px;
  color: var(--accent-text);
  cursor: pointer;
}
.btn-confirm:hover {
  background-color: #22c55e;
}
.btn-cancel {
  padding: 4px 12px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-cancel:hover {
  background-color: var(--btn-hover);
  color: var(--text-primary);
}
.marker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.marker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border-radius: 4px;
  transition: all 0.2s ease;
}
.marker-item:hover {
  background-color: var(--btn-hover);
}
.marker-item.triggered {
  background-color: rgba(74, 222, 128, 0.2);
  border-left: 2px solid #4ade80;
}
.marker-item.editing {
  background-color: rgba(201, 152, 77, 0.15);
  border-left: 2px solid var(--accent-primary);
}
.marker-time {
  font-weight: 600;
  color: var(--accent-primary);
  cursor: pointer;
  min-width: 36px;
}
.marker-time:hover {
  text-decoration: underline;
}
.marker-label {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.marker-label:hover {
  color: var(--accent-primary);
}
.marker-action {
  font-size: 9px;
  color: var(--accent-primary);
  background-color: rgba(201, 152, 77, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}
.marker-buttons {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.btn-edit-marker,
.btn-delete-marker {
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.5;
}
.btn-edit-marker:hover {
  background-color: rgba(201, 152, 77, 0.8);
  color: var(--accent-text);
  opacity: 1;
}
.btn-delete-marker:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}
.btn-edit-marker svg,
.btn-delete-marker svg {
  width: 12px;
  height: 12px;
}
</style>
