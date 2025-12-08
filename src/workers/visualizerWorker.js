/**
 * Visualizer Web Worker mit OffscreenCanvas
 * Rendert Visualizer im Hintergrund für bessere Main-Thread Performance
 */

let offscreenCanvas = null;
let ctx = null;
let width = 0;
let height = 0;
let currentVisualizer = null;

// Einfache Visualizer-Implementierungen für den Worker
const WorkerVisualizers = {
  // Bars Visualizer
  bars: {
    draw(ctx, audioData, bufferLength, w, h, color, opacity) {
      const barCount = Math.min(64, bufferLength);
      const barWidth = w / barCount;
      const barGap = 2;

      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * bufferLength / barCount);
        const value = audioData[dataIndex] / 255;
        const barHeight = value * h * 0.8;

        const x = i * barWidth;
        const y = h - barHeight;

        ctx.fillRect(x + barGap / 2, y, barWidth - barGap, barHeight);
      }
    }
  },

  // Waveform Visualizer
  waveform: {
    draw(ctx, audioData, bufferLength, w, h, color, opacity) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const value = audioData[i] / 255;
        const y = h / 2 + (value - 0.5) * h * 0.8;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    }
  },

  // Circle Visualizer
  circle: {
    draw(ctx, audioData, bufferLength, w, h, color, opacity) {
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.2;

      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 2;

      const points = Math.min(128, bufferLength);

      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
          const dataIndex = Math.floor(i * bufferLength / points) % bufferLength;
          const value = audioData[dataIndex] / 255;

          const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
          const radius = baseRadius + (ring * 30) + value * 100;

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
      }
    }
  },

  // Particles Visualizer (vereinfacht)
  particles: {
    particles: [],
    lastUpdate: 0,

    draw(ctx, audioData, bufferLength, w, h, color, opacity) {
      const now = Date.now();
      const bassValue = audioData[0] / 255;

      // Neue Partikel bei Bass
      if (bassValue > 0.5 && now - this.lastUpdate > 50) {
        this.lastUpdate = now;
        for (let i = 0; i < 5; i++) {
          this.particles.push({
            x: w / 2,
            y: h / 2,
            vx: (Math.random() - 0.5) * bassValue * 20,
            vy: (Math.random() - 0.5) * bassValue * 20,
            life: 1,
            size: Math.random() * 5 + 2
          });
        }
      }

      // Max 200 Partikel
      if (this.particles.length > 200) {
        this.particles = this.particles.slice(-200);
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;

      // Partikel updaten und zeichnen
      this.particles = this.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.life > 0) {
          ctx.globalAlpha = opacity * p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });
    }
  }
};

/**
 * Initialisiert das OffscreenCanvas
 */
function initCanvas(canvas, w, h) {
  offscreenCanvas = canvas;
  ctx = offscreenCanvas.getContext('2d');
  width = w;
  height = h;

  console.log('[VisualizerWorker] Canvas initialisiert:', w, 'x', h);
}

/**
 * Rendert einen Frame
 */
function renderFrame(visualizerName, audioData, bufferLength, color, opacity) {
  if (!ctx || !offscreenCanvas) return null;

  // Canvas leeren
  ctx.clearRect(0, 0, width, height);

  // Visualizer auswählen und zeichnen
  const visualizer = WorkerVisualizers[visualizerName];
  if (visualizer) {
    ctx.save();
    visualizer.draw(ctx, audioData, bufferLength, width, height, color, opacity);
    ctx.restore();
  }

  // Bitmap für Transfer zurückgeben
  return offscreenCanvas.transferToImageBitmap();
}

// Message Handler
self.onmessage = function(e) {
  const { type } = e.data;

  switch (type) {
    case 'init':
      const { canvas, width: w, height: h } = e.data;
      initCanvas(canvas, w, h);
      self.postMessage({ type: 'initialized' });
      break;

    case 'resize':
      width = e.data.width;
      height = e.data.height;
      if (offscreenCanvas) {
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
      }
      break;

    case 'render':
      const { visualizer, audioData, bufferLength, color, opacity } = e.data;
      const bitmap = renderFrame(visualizer, audioData, bufferLength, color, opacity);

      if (bitmap) {
        self.postMessage(
          { type: 'frame', bitmap },
          [bitmap] // Transfer ownership
        );
      }
      break;

    case 'setVisualizer':
      currentVisualizer = e.data.visualizer;
      break;

    default:
      console.warn('[VisualizerWorker] Unknown message type:', type);
  }
};

// Worker ist bereit
self.postMessage({ type: 'ready' });
