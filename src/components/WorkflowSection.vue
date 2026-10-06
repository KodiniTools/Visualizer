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
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- Section Content -->
    <transition name="panel-collapse">
      <div v-show="!isCollapsed" class="section-content">
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  step: {
    type: [String, Number],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  badgeColor: {
    type: String,
    default: 'linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%)',
  },
  defaultCollapsed: {
    type: Boolean,
    default: false,
  },
})

const isCollapsed = ref(props.defaultCollapsed)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.workflow-section {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-lg);
  overflow: hidden;
  transition: all var(--ds-duration-slow) var(--ds-ease);
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
  transition: background var(--ds-duration) var(--ds-ease);
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
  border-radius: var(--ds-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-bold);
  color: var(--accent-text);
  flex-shrink: 0;
  box-shadow: var(--ds-shadow-overlay);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  margin: 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.section-subtitle {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

.collapse-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--btn-hover);
  color: var(--text-muted);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration-slow) var(--ds-ease);
}

.collapse-btn:hover {
  background: var(--btn-hover);
  color: var(--text-primary);
}

.collapse-btn svg {
  width: 16px;
  height: 16px;
  transition: transform var(--ds-duration-slow) var(--ds-ease);
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
</style>
