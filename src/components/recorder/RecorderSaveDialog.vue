<template>
  <UiDialog
    :open="open"
    :title="t('recorder.saveDialog.title')"
    :description="t('recorder.saveDialog.description')"
    @close="emit('cancel')"
  >
    <form class="save-dialog__form" novalidate @submit.prevent="submit">
      <div class="save-dialog__name">
        <div class="save-dialog__field">
          <UiTextField
            v-model="name"
            :label="t('recorder.saveDialog.filename')"
            :error="error"
            autocomplete="off"
            spellcheck="false"
            data-testid="save-dialog-filename"
            @update:model-value="touched = true"
          />
        </div>
        <span class="save-dialog__ext" aria-hidden="true">.{{ extension }}</span>
      </div>
      <UiCallout type="info">{{ t('recorder.saveDialog.locationHint') }}</UiCallout>
    </form>
    <template #footer>
      <UiButton variant="ghost" data-testid="save-dialog-cancel" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </UiButton>
      <UiButton variant="primary" data-testid="save-dialog-confirm" @click="submit">
        {{ t('common.save') }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n'
import { normalizeFilename } from '../../lib/saveFile'
import UiButton from '../ui/UiButton.vue'
import UiCallout from '../ui/UiCallout.vue'
import UiDialog from '../ui/UiDialog.vue'
import UiTextField from '../ui/UiTextField.vue'

/**
 * Fallback-Speichern-Dialog für Browser ohne `showSaveFilePicker`
 * (Firefox, Safari): Dateiname ändern, dann normaler Download.
 * Die Endung ist fest und wird automatisch ergänzt.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    /** Vorgeschlagener Name ohne Endung. */
    filename?: string
    /** Endung ohne Punkt, z. B. 'mp4'. */
    extension: string
  }>(),
  { filename: '' },
)

const emit = defineEmits<{ confirm: [filename: string]; cancel: [] }>()

const { t } = useI18n()
const name = ref(props.filename)
const touched = ref(false)

watch(
  () => [props.open, props.filename],
  ([open]) => {
    if (open) {
      name.value = props.filename
      touched.value = false
    }
  },
)

const normalized = computed(() => normalizeFilename(name.value, props.extension))
const error = computed(() =>
  touched.value && !normalized.value ? t('recorder.saveDialog.filenameRequired') : undefined,
)

function submit() {
  touched.value = true
  if (!normalized.value) return
  emit('confirm', normalized.value)
}
</script>

<style scoped>
.save-dialog__form {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.save-dialog__name {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-2);
}

.save-dialog__field {
  flex: 1;
  min-width: 0;
}

.save-dialog__ext {
  display: inline-flex;
  align-items: center;
  height: var(--ds-control-lg);
  /* Label-Zeile des Textfelds ausgleichen, damit die Endung neben dem Input steht. */
  margin-top: calc(var(--ds-text-sm) * var(--ds-leading) + var(--ds-space-1));
  font-family: var(--ds-font-mono);
  font-size: var(--ds-text-md);
  color: var(--ds-text-2);
}
</style>
