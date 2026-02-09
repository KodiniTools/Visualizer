<template>
  <div class="workflow-section" :class="{ collapsed: isCollapsed }">
    <!-- Section Header -->
    <div class="section-header" @click="toggleCollapse">
      <div class="header-left">
        <div class="step-badge" :style="{ background: badgeColor }">
          {{ step }}
        </div>
        <div class="header-info">
          <h3 class="section-title">{{ title }}</h3>
          <span v-if="subtitle" class="section-subtitle">{{ subtitle }}</span>
        </div>
      </div>
      <button class="collapse-btn" :class="{ rotated: isCollapsed }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>

    <!-- Section Content -->
    <transition name="collapse">
      <div v-show="!isCollapsed" class="section-content">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  step: {
    type: [String, Number],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  badgeColor: {
    type: String,
    default: 'linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%)'
  },
  defaultCollapsed: {
    type: Boolean,
    default: false
  }
});

const isCollapsed = ref(props.defaultCollapsed);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<style scoped>
.workflow-section {
  background: linear-gradient(145deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.workflow-section:hover {
  border-color: var(--border-color);
}

.workflow-section.collapsed {
  background: var(--secondary-bg);
}

/* Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.section-header:hover {
  background: var(--btn-hover);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-text);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.section-subtitle {
  font-size: 10px;
  color: var(--text-muted);
}

.collapse-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--btn-hover);
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.collapse-btn:hover {
  background: var(--btn-hover);
  color: var(--text-primary);
}

.collapse-btn svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.collapse-btn.rotated svg {
  transform: rotate(-90deg);
}

/* Content */
.section-content {
  padding: 0 12px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Collapse Transition */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
