<template>
  <div class="tooltip-wrapper" @mouseenter="showTooltip" @mouseleave="hideTooltip">
    <!-- Trigger Element (slot or default icon) -->
    <slot name="trigger">
      <button class="tooltip-trigger" :class="{ active: isVisible }" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </slot>

    <!-- Tooltip Content -->
    <Teleport to="body">
      <transition name="tooltip">
        <div
          v-if="isVisible"
          ref="tooltipRef"
          class="tooltip-content"
          :class="[`tooltip-${position}`, { 'tooltip-large': large }]"
          :style="tooltipStyle"
        >
          <!-- Arrow -->
          <div class="tooltip-arrow" :class="`arrow-${position}`"></div>

          <!-- Header (optional) -->
          <div v-if="title" class="tooltip-header">
            <span v-if="icon" class="tooltip-icon">{{ icon }}</span>
            <span class="tooltip-title">{{ title }}</span>
          </div>

          <!-- Main Content -->
          <div class="tooltip-body">
            <slot>{{ text }}</slot>
          </div>

          <!-- Keyboard Shortcut (optional) -->
          <div v-if="shortcut" class="tooltip-shortcut">
            <kbd v-for="(key, idx) in shortcutKeys" :key="idx">{{ key }}</kbd>
          </div>

          <!-- Tip (optional) -->
          <div v-if="tip" class="tooltip-tip">
            <span class="tip-icon">💡</span>
            <span>{{ tip }}</span>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  shortcut: {
    type: String,
    default: ''
  },
  tip: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: 'top',
    validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  large: {
    type: Boolean,
    default: false
  },
  delay: {
    type: Number,
    default: 300
  }
});

const isVisible = ref(false);
const tooltipRef = ref(null);
const triggerRect = ref(null);
let showTimeout = null;
let hideTimeout = null;

const shortcutKeys = computed(() => {
  if (!props.shortcut) return [];
  return props.shortcut.split('+').map(key => key.trim());
});

const tooltipStyle = computed(() => {
  if (!triggerRect.value) return {};

  const rect = triggerRect.value;
  const padding = 12;

  switch (props.position) {
    case 'top':
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - padding}px`,
        transform: 'translate(-50%, -100%)'
      };
    case 'bottom':
      return {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + padding}px`,
        transform: 'translate(-50%, 0)'
      };
    case 'left':
      return {
        left: `${rect.left - padding}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translate(-100%, -50%)'
      };
    case 'right':
      return {
        left: `${rect.right + padding}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translate(0, -50%)'
      };
    default:
      return {};
  }
});

function showTooltip(event) {
  clearTimeout(hideTimeout);

  showTimeout = setTimeout(() => {
    const trigger = event.currentTarget;
    triggerRect.value = trigger.getBoundingClientRect();
    isVisible.value = true;
  }, props.delay);
}

function hideTooltip() {
  clearTimeout(showTimeout);

  hideTimeout = setTimeout(() => {
    isVisible.value = false;
  }, 100);
}

onUnmounted(() => {
  clearTimeout(showTimeout);
  clearTimeout(hideTimeout);
});
</script>

<style scoped>
.tooltip-wrapper {
  display: inline-flex;
  position: relative;
}

.tooltip-trigger {
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tooltip-trigger:hover,
.tooltip-trigger.active {
  background: rgba(110, 168, 254, 0.2);
  color: #6ea8fe;
}

.tooltip-trigger svg {
  width: 14px;
  height: 14px;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tooltip-trigger {
  background: rgba(1, 79, 153, 0.1);
  color: rgba(0, 57, 113, 0.5);
}

[data-theme='light'] .tooltip-trigger:hover,
[data-theme='light'] .tooltip-trigger.active {
  background: rgba(1, 79, 153, 0.2);
  color: #014f99;
}
</style>

<style>
/* Global styles for teleported tooltip */
.tooltip-content {
  position: fixed;
  z-index: 10001;
  background: linear-gradient(145deg, #2a2a2a 0%, #1e1e1e 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
  max-width: 280px;
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

.tooltip-content.tooltip-large {
  max-width: 360px;
  padding: 16px 20px;
}

/* Arrow */
.tooltip-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transform: rotate(45deg);
}

.arrow-top {
  bottom: -7px;
  left: 50%;
  margin-left: -6px;
  border-top: none;
  border-left: none;
}

.arrow-bottom {
  top: -7px;
  left: 50%;
  margin-left: -6px;
  border-bottom: none;
  border-right: none;
}

.arrow-left {
  right: -7px;
  top: 50%;
  margin-top: -6px;
  border-bottom: none;
  border-left: none;
}

.arrow-right {
  left: -7px;
  top: 50%;
  margin-top: -6px;
  border-top: none;
  border-right: none;
}

/* Header */
.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-icon {
  font-size: 16px;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

/* Body */
.tooltip-body {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

/* Shortcut */
.tooltip-shortcut {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-shortcut kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
}

/* Tip */
.tooltip-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: rgba(255, 193, 7, 0.9);
}

.tooltip-tip .tip-icon {
  font-size: 12px;
  flex-shrink: 0;
}

/* Transitions */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%) scale(0.95);
}

.tooltip-bottom.tooltip-enter-from,
.tooltip-bottom.tooltip-leave-to {
  transform: translate(-50%, 0) scale(0.95);
}

.tooltip-left.tooltip-enter-from,
.tooltip-left.tooltip-leave-to {
  transform: translate(-100%, -50%) scale(0.95);
}

.tooltip-right.tooltip-enter-from,
.tooltip-right.tooltip-leave-to {
  transform: translate(0, -50%) scale(0.95);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tooltip-content {
  background: linear-gradient(145deg, #FFFFFF 0%, #f9f2d5 100%);
  border-color: rgba(0, 57, 113, 0.15);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12),
              0 0 0 1px rgba(0, 57, 113, 0.08);
}

[data-theme='light'] .tooltip-arrow {
  background: #FFFFFF;
  border-color: rgba(0, 57, 113, 0.15);
}

[data-theme='light'] .tooltip-header {
  border-bottom-color: rgba(0, 57, 113, 0.1);
}

[data-theme='light'] .tooltip-title {
  color: #003971;
}

[data-theme='light'] .tooltip-body {
  color: #003971;
}

[data-theme='light'] .tooltip-shortcut {
  border-top-color: rgba(0, 57, 113, 0.1);
}

[data-theme='light'] .tooltip-shortcut kbd {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.2);
  color: #003971;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .tooltip-tip {
  background: rgba(201, 152, 77, 0.12);
  color: #c9984d;
}
</style>
