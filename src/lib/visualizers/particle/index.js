/**
 * Particle visualizers - Particle systems and space effects
 * @module visualizers/particle
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const particleStorm = {
  name_de: "Partikel-Sturm",
  name_en: "Particle Storm",
  init(width, height) {
    visualizerState.particleStorm = { particles: [], fov: width * 0.8 };
    for (let i = 0; i < 350; i++) {
      visualizerState.particleStorm.particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 1500,
        size: 1 + Math.random() * 3,
        hueOffset: Math.random() * 60
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.particleStorm) this.init(width, height);
    const state = visualizerState.particleStorm;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    const speed = (15 + bassEnergy * 50) * intensity;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
      gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${bassEnergy * 0.3})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    state.particles.forEach((p, index) => {
      p.z -= speed;

      const freqIndex = Math.floor((index / state.particles.length) * maxFreqIndex);
      const freq = (dataArray[freqIndex] || 0) / 255;
      p.x += (Math.random() - 0.5) * freq * 5;
      p.y += (Math.random() - 0.5) * freq * 5;

      if (p.z <= 0) {
        p.x = (Math.random() - 0.5) * width * 1.5;
        p.y = (Math.random() - 0.5) * height * 1.5;
        p.z = 1500;
      }

      const scale = state.fov / (state.fov + p.z);
      const screenX = centerX + p.x * scale;
      const screenY = centerY + p.y * scale;
      const depth = 1 - p.z / 1500;

      const radius = depth * p.size * 4 * intensity;

      if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50 && radius > 0.5) {
        const streakLength = Math.min(speed * depth * 0.5, 30);
        const hue = (baseHsl.h + p.hueOffset + midEnergy * 40) % 360;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY + streakLength);
        ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${depth * 0.7})`;
        ctx.lineWidth = radius * 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${70 + depth * 25}%, ${depth * 0.9})`;
        ctx.fill();
      }
    });
  }
};

export const rippleEffect = {
  name_de: "Wellen-Effekt (High-Freq-Bursts)",
  name_en: "Ripple Effect (High-Freq Bursts)",
  init() {
    visualizerState.ripples = [];
    visualizerState.rippleTime = 0;
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.ripples) this.init();

    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    visualizerState.rippleTime = (visualizerState.rippleTime || 0) + 0.02;
    const time = visualizerState.rippleTime;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const pulseGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.6
      );
      pulseGradient.addColorStop(0, `hsla(${baseHsl.h}, 80%, 30%, ${bassEnergy * 0.2})`);
      pulseGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 70%, 20%, ${bassEnergy * 0.1})`);
      pulseGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = pulseGradient;
      ctx.fillRect(0, 0, width, height);
    }

    const energyTypes = [
      { energy: bassEnergy, threshold: 0.25, size: 200, speed: 4, hueShift: 0 },
      { energy: midEnergy, threshold: 0.2, size: 150, speed: 5, hueShift: 30 },
      { energy: highEnergy, threshold: 0.15, size: 100, speed: 6, hueShift: 60 }
    ];

    energyTypes.forEach(({ energy, threshold, size, speed, hueShift }) => {
      if (energy > threshold && Math.random() < 0.5 * intensity && visualizerState.ripples.length < 30) {
        visualizerState.ripples.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0,
          maxRadius: (size * 0.5 + energy * size) * intensity,
          hue: (baseHsl.h + hueShift + Math.random() * 40) % 360,
          alpha: 1,
          speed: (speed + energy * 4) * intensity,
          thickness: 3 + energy * 5
        });
      }
    });

    withSafeCanvasState(ctx, () => {
      for (let i = visualizerState.ripples.length - 1; i >= 0; i--) {
        const r = visualizerState.ripples[i];
        r.radius += r.speed;
        const progress = r.radius / r.maxRadius;
        r.alpha = 1 - progress;

        if (r.alpha <= 0) {
          visualizerState.ripples.splice(i, 1);
          continue;
        }

        const rings = 2;
        for (let ring = 0; ring < rings; ring++) {
          const ringRadius = r.radius - ring * 20;
          if (ringRadius > 0) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

            const ringAlpha = r.alpha * (1 - ring * 0.4);
            const lightness = 50 + (1 - progress) * 30;
            ctx.strokeStyle = `hsla(${r.hue}, 100%, ${lightness}%, ${ringAlpha})`;
            ctx.lineWidth = (r.thickness || 4) * (1 - ring * 0.3) * (1 - progress * 0.5);

            if (progress < 0.3) {
              ctx.shadowColor = `hsl(${r.hue}, 100%, 60%)`;
              ctx.shadowBlur = 15 * (1 - progress * 3);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        if (progress < 0.2) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, 5 * (1 - progress * 5), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${r.hue}, 100%, 80%, ${1 - progress * 5})`;
          ctx.fill();
        }
      }
    });

    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      const px = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * width;
      const py = (Math.cos(time * 0.7 + i * 0.3) * 0.5 + 0.5) * height;
      const size = 2 + Math.sin(time * 2 + i) * 1 + midEnergy * 3;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(baseHsl.h + i * 10) % 360}, 80%, 60%, ${0.2 + midEnergy * 0.3})`;
      ctx.fill();
    }
  }
};

export const cosmicNebula = {
  name_de: "Kosmischer Nebel",
  name_en: "Cosmic Nebula",
  init(width, height) {
    visualizerState.cosmicNebula = { particles: [], time: 0 };
    for (let i = 0; i < 400; i++) {
      const clusterX = Math.random() * width;
      const clusterY = Math.random() * height;
      visualizerState.cosmicNebula.particles.push({
        x: clusterX, y: clusterY,
        baseX: clusterX + (Math.random() - 0.5) * 100,
        baseY: clusterY + (Math.random() - 0.5) * 100,
        radius: 2 + Math.random() * 5,
        hueOffset: Math.random() * 120,
        speed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        orbitSize: 30 + Math.random() * 80
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.cosmicNebula || visualizerState.cosmicNebula.particles.length === 0) {
      this.init(width, height);
    }
    const state = visualizerState.cosmicNebula;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.2) {
      const centerGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 300 + bassEnergy * 200);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 50%, ${bassEnergy * 0.15})`);
      centerGlow.addColorStop(0.5, `hsla(${(baseHsl.h + 60) % 360}, 80%, 40%, ${bassEnergy * 0.08})`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);
    }

    const time = Date.now() * 0.001;

    state.particles.forEach((p, index) => {
      const freqPos = (index % 100) / 100;
      const freqIndex = Math.floor(freqPos * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;

      const baseMovement = 0.3 + amplitude * 0.7;
      const orbitRadius = p.orbitSize * baseMovement * (1 + bassEnergy) * intensity;

      const angle = time * p.speed + p.phase + index * 0.1;

      const spiral = Math.sin(time * 0.5 + index * 0.05) * 20 * midEnergy;
      p.x = p.baseX + Math.cos(angle) * orbitRadius + spiral;
      p.y = p.baseY + Math.sin(angle) * orbitRadius + Math.cos(angle * 0.7) * spiral;

      if (p.x < -50) p.baseX += width + 100;
      if (p.x > width + 50) p.baseX -= width + 100;
      if (p.y < -50) p.baseY += height + 100;
      if (p.y > height + 50) p.baseY -= height + 100;

      const hue = (baseHsl.h + p.hueOffset + midEnergy * 60 + time * 10) % 360;
      const particleSize = p.radius * (1 + amplitude * 2) * intensity;

      const minAlpha = 0.3;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, particleSize * 5);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${minAlpha + amplitude * 0.6})`);
      gradient.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${(minAlpha + amplitude * 0.4) * 0.6})`);
      gradient.addColorStop(0.7, `hsla(${(hue + 30) % 360}, 80%, 40%, ${(minAlpha + amplitude * 0.2) * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize * 5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, ${85 + highEnergy * 15}%, ${0.7 + amplitude * 0.3})`;
      ctx.fill();
    });
  }
};

export const pixelFireworks = {
  name_de: 'Retro-Sternenfeld (Warp)',
  name_en: 'Retro Starfield (Warp)',
  init() {
    visualizerState.retroStarfield = null;
  },
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);

    if (!visualizerState.retroStarfield) {
      const stars = [];
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: (Math.random() - 0.5) * w * 3,
          y: (Math.random() - 0.5) * h * 3,
          z: Math.random() * 1000 + 1
        });
      }
      visualizerState.retroStarfield = { stars };
    }
    const state = visualizerState.retroStarfield;

    ctx.clearRect(0, 0, w, h);

    const bassEnd = Math.floor(bufferLength * 0.15);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += dataArray[i];
    }
    const bassEnergy = bassSum / (bassEnd * 255);

    const speed = 8 + bassEnergy * 40;
    const centerX = w / 2;
    const centerY = h / 2;

    for (const star of state.stars) {
      star.z -= speed;

      if (star.z <= 1) {
        star.x = (Math.random() - 0.5) * w * 3;
        star.y = (Math.random() - 0.5) * h * 3;
        star.z = 1000;
      }

      const screenX = centerX + (star.x / star.z) * 400;
      const screenY = centerY + (star.y / star.z) * 400;

      const oldZ = star.z + speed * 0.5;
      const oldScreenX = centerX + (star.x / oldZ) * 400;
      const oldScreenY = centerY + (star.y / oldZ) * 400;

      if (screenX >= 0 && screenX <= w && screenY >= 0 && screenY <= h) {
        const size = Math.max(1, (1 - star.z / 1000) * 6);
        const brightness = Math.min(100, 30 + (1 - star.z / 1000) * 70);
        const hue = (baseHsl.h + (1 - star.z / 1000) * 60) % 360;

        if (speed > 15) {
          ctx.beginPath();
          ctx.moveTo(oldScreenX, oldScreenY);
          ctx.lineTo(screenX, screenY);
          ctx.strokeStyle = `hsla(${hue}, 80%, ${brightness * 0.6}%, ${intensity * 0.7})`;
          ctx.lineWidth = size * 0.5;
          ctx.stroke();
        }

        ctx.fillStyle = `hsl(${hue}, 70%, ${brightness}%)`;
        ctx.fillRect(
          Math.floor(screenX - size / 2),
          Math.floor(screenY - size / 2),
          Math.ceil(size),
          Math.ceil(size)
        );

        if (star.z < 200) {
          ctx.fillStyle = `hsla(${hue}, 50%, 95%, ${intensity})`;
          ctx.fillRect(
            Math.floor(screenX - size / 4),
            Math.floor(screenY - size / 4),
            Math.ceil(size / 2),
            Math.ceil(size / 2)
          );
        }
      }
    }

    ctx.restore();
  }
};

export const particleVisualizers = {
  particleStorm,
  rippleEffect,
  cosmicNebula,
  pixelFireworks
};
