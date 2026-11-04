<template>
  <div>
    <!-- Preset-Auswahl -->
    <UiSelect
      :model-value="selectedPreset"
      :options="presetOptions"
      :label="t('foto.filterPreset')"
      label-hidden
      size="sm"
      @update:model-value="onPresetChange"
    />

    <!-- Rückgängig / Wiederholen / Zurücksetzen -->
    <div class="history-actions">
      <UiButton
        v-for="action in HISTORY_ACTIONS"
        :key="action.key"
        size="sm"
        :disabled="action.disabled?.()"
        @click="action.run"
      >
        <template #icon>
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path v-for="d in action.paths" :key="d" :d="d" />
          </svg>
        </template>
        {{ t(`foto.${action.key}`) }}
      </UiButton>
    </div>
  </div>
</template>

<script setup>
/** Filter-Preset des aktiven Bildes sowie Rückgängig/Wiederholen/Zurücksetzen. */
import { computed, inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import { localizedName } from '../../../lib/localizedName.js'
import UiButton from '../../ui/UiButton.vue'
import UiSelect from '../../ui/UiSelect.vue'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
  presets,
  locale,
  canUndo,
  canRedo,
  selectedPreset,
  onPresetChange,
  undo,
  redo,
  resetFilters,
} = ifc

/** „Kein Filter“ und die Presets mit dem Namen der aktuellen Sprache. */
const presetOptions = computed(() => [
  { value: '', label: t('foto.noFilter') },
  ...presets.value.map((p) => ({
    value: p.id,
    label: localizedName(p, locale.value),
  })),
])

const HISTORY_ACTIONS = [
  {
    key: 'undo',
    run: undo,
    disabled: () => !canUndo.value,
    paths: ['M3 7v6h6', 'M3 13C5.33 7.5 10 4 16 4a9 9 0 0 1 0 18H8'],
  },
  {
    key: 'redo',
    run: redo,
    disabled: () => !canRedo.value,
    paths: ['M21 7v6h-6', 'M21 13C18.67 7.5 14 4 8 4a9 9 0 0 0 0 18h8'],
  },
  {
    key: 'resetFilters',
    run: resetFilters,
    paths: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  },
]
</script>

<style scoped>
/* Drei Buttons in Größe sm; bei schmalem Panel bricht die Zeile um */
.history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
  margin-top: var(--ds-space-4);
}
.history-actions > * {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
