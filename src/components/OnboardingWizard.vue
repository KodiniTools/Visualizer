<template>
  <Teleport to="body">
    <div v-if="isVisible" class="onboarding-overlay" @click.self="handleBackdropClick">
      <div class="onboarding-modal">
        <!-- Header -->
        <div class="modal-header">
          <div class="step-indicator">
            <span
              v-for="(step, index) in steps"
              :key="index"
              class="step-dot"
              :class="{ active: index === currentStep, completed: index < currentStep }"
              @click="goToStep(index)"
            ></span>
          </div>
          <button @click="skipTutorial" class="skip-btn" title="Tutorial überspringen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="modal-content">
          <transition name="slide" mode="out-in">
            <div :key="currentStep" class="step-content">
              <!-- Step Icon -->
              <div class="step-icon" :style="{ background: steps[currentStep].iconBg }">
                <span v-html="steps[currentStep].icon"></span>
              </div>

              <!-- Step Title -->
              <h2 class="step-title">{{ steps[currentStep].title }}</h2>

              <!-- Step Description -->
              <p class="step-description">{{ steps[currentStep].description }}</p>

              <!-- Step Features -->
              <ul v-if="steps[currentStep].features" class="step-features">
                <li v-for="(feature, idx) in steps[currentStep].features" :key="idx">
                  <span class="feature-icon">{{ feature.icon }}</span>
                  <span class="feature-text">{{ feature.text }}</span>
                </li>
              </ul>

              <!-- Step Tip -->
              <div v-if="steps[currentStep].tip" class="step-tip">
                <span class="tip-icon">💡</span>
                <span class="tip-text">{{ steps[currentStep].tip }}</span>
              </div>
            </div>
          </transition>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            v-if="currentStep > 0"
            @click="prevStep"
            class="btn btn-secondary"
          >
            Zurück
          </button>
          <div v-else class="spacer"></div>

          <div class="step-counter">
            {{ currentStep + 1 }} / {{ steps.length }}
          </div>

          <button
            v-if="currentStep < steps.length - 1"
            @click="nextStep"
            class="btn btn-primary"
          >
            Weiter
          </button>
          <button
            v-else
            @click="completeTutorial"
            class="btn btn-success"
          >
            Los geht's!
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emit = defineEmits(['complete', 'skip']);

const isVisible = ref(false);
const currentStep = ref(0);

const STORAGE_KEY = 'audio-visualizer-onboarding-completed';

const steps = [
  {
    title: 'Willkommen zum Audio Visualizer!',
    description: 'Erstellen Sie beeindruckende Musikvideos mit dynamischen Visualisierungen, Text-Overlays und Bildern. Perfekt für Social Media!',
    icon: '🎵',
    iconBg: 'linear-gradient(135deg, #6ea8fe 0%, #a78bfa 100%)',
    features: [
      { icon: '🎨', text: '30+ einzigartige Visualizer-Effekte' },
      { icon: '📱', text: 'Optimiert für TikTok, Instagram & YouTube' },
      { icon: '🎬', text: 'Video-Export in hoher Qualität' }
    ],
    tip: 'Dieses Tutorial können Sie jederzeit über das Hilfe-Menü erneut starten.'
  },
  {
    title: 'Schritt 1: Audio hochladen',
    description: 'Beginnen Sie mit dem Hochladen Ihrer Audiodateien. Sie können mehrere Tracks hinzufügen und eine Playlist erstellen.',
    icon: '📁',
    iconBg: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
    features: [
      { icon: '🎵', text: 'Unterstützte Formate: MP3, WAV, OGG, M4A' },
      { icon: '📂', text: 'Drag & Drop oder Klick zum Hochladen' },
      { icon: '📋', text: 'Mehrere Tracks zur Playlist hinzufügen' }
    ],
    tip: 'Sie finden den Upload-Bereich im rechten Panel unter "Audiodateien".'
  },
  {
    title: 'Schritt 2: Visualizer wählen',
    description: 'Wählen Sie aus über 30 Visualizer-Effekten den passenden Stil für Ihre Musik. Von klassischen Balken bis zu Partikel-Effekten.',
    icon: '🎨',
    iconBg: 'linear-gradient(135deg, #FF9800 0%, #F44336 100%)',
    features: [
      { icon: '📊', text: 'Bars, Wellen, Spiralen, Partikel u.v.m.' },
      { icon: '🎨', text: 'Farben und Intensität anpassbar' },
      { icon: '✨', text: 'Transparenz für kreative Überlagerungen' }
    ],
    tip: 'Spielen Sie die Musik ab, um die Visualisierung in Echtzeit zu sehen!'
  },
  {
    title: 'Schritt 3: Text & Bilder hinzufügen',
    description: 'Personalisieren Sie Ihr Video mit Text-Overlays und Bildern. Ideal für Song-Titel, Künstlernamen oder Logos.',
    icon: '✏️',
    iconBg: 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)',
    features: [
      { icon: '🔤', text: 'Mehrzeilige Texte mit vielen Schriftarten' },
      { icon: '🖼️', text: 'Bilder mit Filtern und Effekten' },
      { icon: '🎭', text: 'Schatten, Konturen und Transparenz' }
    ],
    tip: 'Im linken Panel finden Sie den Text-Manager und das Foto-Panel.'
  },
  {
    title: 'Schritt 4: Video aufnehmen',
    description: 'Wenn alles bereit ist, nehmen Sie Ihr Video auf. Wählen Sie die Qualität und exportieren Sie für Ihre Plattform.',
    icon: '🎬',
    iconBg: 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)',
    features: [
      { icon: '⚙️', text: 'Qualitätsstufen von Low bis Ultra' },
      { icon: '▶️', text: 'Prepare → Start → Stop Workflow' },
      { icon: '💾', text: 'Download als WebM/MP4' }
    ],
    tip: 'Wählen Sie einen Workspace (z.B. TikTok 1080x1920) für das richtige Format.'
  },
  {
    title: 'Bereit zum Starten!',
    description: 'Sie kennen jetzt die Grundlagen. Experimentieren Sie mit den verschiedenen Optionen und erstellen Sie Ihre eigenen Musikvideos!',
    icon: '🚀',
    iconBg: 'linear-gradient(135deg, #00BCD4 0%, #4CAF50 100%)',
    features: [
      { icon: '⌨️', text: 'Leertaste: Play/Pause' },
      { icon: '🔄', text: 'Strg+Z: Rückgängig' },
      { icon: '❓', text: 'Hilfe jederzeit über das Menü' }
    ],
    tip: 'Viel Spaß beim Erstellen! Bei Fragen schauen Sie in die Dokumentation.'
  }
];

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function goToStep(index) {
  currentStep.value = index;
}

function completeTutorial() {
  localStorage.setItem(STORAGE_KEY, 'true');
  isVisible.value = false;
  emit('complete');
}

function skipTutorial() {
  localStorage.setItem(STORAGE_KEY, 'true');
  isVisible.value = false;
  emit('skip');
}

function handleBackdropClick() {
  // Optional: Close on backdrop click
  // skipTutorial();
}

// Public method to show the wizard again
function show() {
  currentStep.value = 0;
  isVisible.value = true;
}

// Check if should show on mount
onMounted(() => {
  const hasCompleted = localStorage.getItem(STORAGE_KEY);
  if (!hasCompleted) {
    isVisible.value = true;
  }
});

// Expose show method for parent components
defineExpose({ show });
</script>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.onboarding-modal {
  background: linear-gradient(145deg, #1e1e1e 0%, #2a2a2a 100%);
  border-radius: 20px;
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.step-indicator {
  display: flex;
  gap: 8px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.step-dot:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.2);
}

.step-dot.active {
  background: #6ea8fe;
  box-shadow: 0 0 10px rgba(110, 168, 254, 0.5);
  transform: scale(1.2);
}

.step-dot.completed {
  background: #4CAF50;
}

.skip-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.skip-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  transform: rotate(90deg);
}

.skip-btn svg {
  width: 16px;
  height: 16px;
}

/* Content */
.modal-content {
  padding: 32px 24px;
  flex: 1;
  overflow-y: auto;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.step-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.step-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 24px 0;
  max-width: 420px;
}

.step-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  width: 100%;
  max-width: 360px;
}

.step-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.step-features li:hover {
  background: rgba(110, 168, 254, 0.1);
  transform: translateX(4px);
}

.feature-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.feature-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
}

.step-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 10px;
  max-width: 400px;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tip-text {
  font-size: 12px;
  color: rgba(255, 193, 7, 0.9);
  text-align: left;
  line-height: 1.5;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.spacer {
  width: 80px;
}

.step-counter {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
}

.btn-primary {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a96e5 100%);
  color: #121212;
  box-shadow: 0 4px 15px rgba(110, 168, 254, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(110, 168, 254, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-success {
  background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Responsive */
@media (max-width: 560px) {
  .onboarding-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-content {
    padding: 24px 16px;
  }

  .step-icon {
    width: 64px;
    height: 64px;
    font-size: 28px;
  }

  .step-title {
    font-size: 20px;
  }

  .step-description {
    font-size: 13px;
  }

  .btn {
    padding: 10px 16px;
    min-width: 80px;
  }
}
</style>
