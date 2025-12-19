<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">Audio Visualizer</div>
        <h1 class="hero-title">
          Verwandle deine Musik in
          <span class="gradient-text">visuelle Kunst</span>
        </h1>
        <p class="hero-subtitle">
          Erstelle beeindruckende Audio-Visualisierungen für Social Media,
          Musikvideos und mehr. Kostenlos, direkt im Browser.
        </p>
        <div class="hero-actions">
          <router-link to="/app" class="btn-primary">
            <span class="btn-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </span>
            Visualizer starten
          </router-link>
          <a href="#features" class="btn-secondary">
            Mehr erfahren
          </a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visualizer-preview">
          <div class="wave-bar" v-for="n in 20" :key="n" :style="{ animationDelay: `${n * 0.05}s` }"></div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="section-header">
        <h2 class="section-title">Leistungsstarke Funktionen</h2>
        <p class="section-subtitle">Alles was du brauchst, um professionelle Audio-Visualisierungen zu erstellen</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon" style="background: linear-gradient(135deg, #BCE5E5, #9EBEC1);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <h3 class="feature-title">100+ Visualizer</h3>
          <p class="feature-description">
            Wahle aus einer grossen Sammlung von einzigartigen Audio-Visualisierungen -
            von klassischen Wellenformen bis zu spektakularen 3D-Effekten.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: linear-gradient(135deg, #C5DEB0, #9EBEC1);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
          </div>
          <h3 class="feature-title">Social Media Formate</h3>
          <p class="feature-description">
            Vordefinierte Canvas-Grossen fur TikTok, Instagram Reels, YouTube Shorts
            und mehr - perfekt optimiert fur jede Plattform.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: linear-gradient(135deg, #609198, #BCE5E5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </div>
          <h3 class="feature-title">HD Video Export</h3>
          <p class="feature-description">
            Exportiere deine Visualisierungen als hochauflosende MP4-Videos
            mit bis zu 60 FPS - direkt aus dem Browser, ohne zusatzliche Software.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" style="background: linear-gradient(135deg, #A8A992, #C5DEB0);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <h3 class="feature-title">Text & Bilder</h3>
          <p class="feature-description">
            Fuge Texte, Logos und Bilder hinzu. Mit vollstandiger Kontrolle uber
            Position, Grosse, Filter und audio-reaktive Effekte.
          </p>
        </div>
      </div>
    </section>

    <!-- Video Demo Section -->
    <section class="video-section">
      <div class="section-header">
        <h2 class="section-title">So funktioniert es</h2>
        <p class="section-subtitle">Schau dir an, wie einfach du atemberaubende Visualisierungen erstellen kannst</p>
      </div>
      <div class="video-container">
        <div class="video-placeholder">
          <div class="video-placeholder-content">
            <div class="play-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <p class="video-placeholder-text">Demo-Video kommt bald</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
      <div class="section-header">
        <h2 class="section-title">Haufig gestellte Fragen</h2>
        <p class="section-subtitle">Antworten auf die wichtigsten Fragen</p>
      </div>
      <div class="faq-list">
        <div
          class="faq-item"
          v-for="(faq, index) in faqs"
          :key="index"
          :class="{ 'active': activeFaq === index }"
          @click="toggleFaq(index)"
        >
          <div class="faq-question">
            <span>{{ faq.question }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="faq-icon"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="faq-answer">
            <p>{{ faq.answer }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">Bereit zum Starten?</h2>
        <p class="cta-subtitle">Erstelle jetzt deine erste Audio-Visualisierung - kostenlos und ohne Anmeldung.</p>
        <router-link to="/app" class="btn-primary btn-large">
          <span class="btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </span>
          Visualizer starten
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2025 Audio Visualizer. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const activeFaq = ref(null);

const faqs = [
  {
    question: 'Ist der Audio Visualizer kostenlos?',
    answer: 'Ja, der Audio Visualizer ist komplett kostenlos nutzbar. Du kannst alle Visualizer, Formate und Export-Funktionen ohne Einschrankungen verwenden.'
  },
  {
    question: 'Welche Audioformate werden unterstutzt?',
    answer: 'Der Visualizer unterstutzt alle gangigen Audioformate wie MP3, WAV, OGG, FLAC und mehr. Du kannst deine Audiodateien einfach per Drag & Drop hochladen.'
  },
  {
    question: 'Kann ich die Videos fur kommerzielle Zwecke nutzen?',
    answer: 'Ja, alle mit dem Visualizer erstellten Videos kannst du uneingeschrankt fur private und kommerzielle Zwecke nutzen - auf YouTube, TikTok, Instagram oder anderen Plattformen.'
  },
  {
    question: 'Werden meine Audiodateien auf einen Server hochgeladen?',
    answer: 'Nein, alle Verarbeitung findet lokal in deinem Browser statt. Deine Audiodateien werden niemals auf unsere Server hochgeladen - deine Daten bleiben privat.'
  },
  {
    question: 'Welche Browser werden unterstutzt?',
    answer: 'Der Visualizer funktioniert am besten mit aktuellen Versionen von Chrome, Firefox, Edge und Safari. Fur die beste Performance empfehlen wir Chrome oder Edge.'
  },
  {
    question: 'Wie exportiere ich mein Video?',
    answer: 'Klicke einfach auf den "Aufnehmen"-Button, spiele deine Musik ab, und der Visualizer nimmt automatisch alles auf. Nach dem Stoppen wird das Video als MP4-Datei heruntergeladen.'
  }
];

function toggleFaq(index) {
  activeFaq.value = activeFaq.value === index ? null : index;
}
</script>

<style scoped>
/* Color Variables based on the provided palette */
:root {
  --landing-cyan-light: #BCE5E5;
  --landing-olive: #A8A992;
  --landing-cyan-mid: #9EBEC1;
  --landing-gray: #E9E9EB;
  --landing-green: #C5DEB0;
  --landing-cyan-dark: #609198;
}

.landing-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a1012 0%, #0f1416 50%, #0a1012 100%);
  color: #E9E9EB;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow-x: hidden;
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(96, 145, 152, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, rgba(188, 229, 229, 0.08) 0%, transparent 40%),
              radial-gradient(ellipse at 20% 60%, rgba(197, 222, 176, 0.08) 0%, transparent 40%);
  pointer-events: none;
}

.hero-content {
  max-width: 700px;
  text-align: center;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  background: rgba(96, 145, 152, 0.15);
  border: 1px solid rgba(96, 145, 152, 0.3);
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #BCE5E5;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 28px;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 24px 0;
  color: #E9E9EB;
}

.gradient-text {
  background: linear-gradient(135deg, #BCE5E5 0%, #609198 50%, #C5DEB0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.7;
  color: #A8A992;
  margin: 0 0 40px 0;
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #609198 0%, #9EBEC1 100%);
  color: #0f1416;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(96, 145, 152, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(96, 145, 152, 0.5);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: transparent;
  color: #BCE5E5;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid rgba(188, 229, 229, 0.3);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: #BCE5E5;
  background: rgba(188, 229, 229, 0.1);
}

.btn-large {
  padding: 20px 44px;
  font-size: 1.1rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-visual {
  display: none;
}

.visualizer-preview {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 200px;
  gap: 4px;
  padding: 20px;
}

.wave-bar {
  width: 8px;
  background: linear-gradient(180deg, #609198 0%, #BCE5E5 100%);
  border-radius: 4px;
  animation: wave 1.2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { height: 20px; }
  50% { height: 100px; }
}

/* Section Styling */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 16px 0;
}

.section-subtitle {
  font-size: 1.1rem;
  color: #A8A992;
  margin: 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

/* Features Section */
.features {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.feature-card {
  background: linear-gradient(180deg, rgba(21, 27, 29, 0.9) 0%, rgba(21, 27, 29, 0.6) 100%);
  border: 1px solid rgba(158, 190, 193, 0.15);
  border-radius: 20px;
  padding: 36px 28px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(96, 145, 152, 0.4);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #0f1416;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #E9E9EB;
  margin: 0 0 12px 0;
}

.feature-description {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #9EBEC1;
  margin: 0;
}

/* Video Section */
.video-section {
  padding: 100px 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 20px;
  overflow: hidden;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(21, 27, 29, 0.95) 0%, rgba(10, 16, 18, 0.95) 100%);
  border: 2px dashed rgba(96, 145, 152, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.video-placeholder-content {
  text-align: center;
}

.play-button {
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #609198 0%, #9EBEC1 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #0f1416;
  transition: all 0.3s ease;
  cursor: pointer;
}

.play-button:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(96, 145, 152, 0.5);
}

.play-button svg {
  margin-left: 6px;
}

.video-placeholder-text {
  color: #A8A992;
  font-size: 1rem;
  margin: 0;
}

/* FAQ Section */
.faq-section {
  padding: 100px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-item {
  background: rgba(21, 27, 29, 0.8);
  border: 1px solid rgba(158, 190, 193, 0.15);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.faq-item:hover {
  border-color: rgba(96, 145, 152, 0.3);
}

.faq-item.active {
  border-color: rgba(96, 145, 152, 0.4);
}

.faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #E9E9EB;
}

.faq-icon {
  color: #609198;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 16px;
}

.faq-item.active .faq-icon {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.faq-item.active .faq-answer {
  max-height: 300px;
}

.faq-answer p {
  padding: 0 28px 24px;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #9EBEC1;
}

/* CTA Section */
.cta-section {
  padding: 120px 24px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 100%, rgba(96, 145, 152, 0.12) 0%, transparent 60%);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  color: #E9E9EB;
  margin: 0 0 20px 0;
}

.cta-subtitle {
  font-size: 1.15rem;
  color: #A8A992;
  margin: 0 0 40px 0;
  line-height: 1.7;
}

/* Footer */
.footer {
  padding: 40px 24px;
  border-top: 1px solid rgba(158, 190, 193, 0.1);
}

.footer-content {
  text-align: center;
}

.footer-content p {
  margin: 0;
  color: #A8A992;
  font-size: 0.9rem;
}

/* Responsive */
@media (min-width: 768px) {
  .hero {
    flex-direction: row;
    gap: 60px;
    padding: 80px 48px;
  }

  .hero-content {
    text-align: left;
    flex: 1;
  }

  .hero-subtitle {
    margin-left: 0;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .hero-visual {
    display: block;
    flex: 1;
    max-width: 400px;
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .features,
  .video-section,
  .faq-section {
    padding: 60px 20px;
  }

  .feature-card {
    padding: 28px 24px;
  }

  .faq-question {
    padding: 20px 22px;
    font-size: 0.95rem;
  }

  .faq-answer p {
    padding: 0 22px 20px;
    font-size: 0.9rem;
  }
}
</style>
