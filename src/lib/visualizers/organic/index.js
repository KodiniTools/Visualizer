/**
 * Organic visualizers - Natural, flowing, and living patterns
 * @module visualizers/organic
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const spiralGalaxy = {
  name_de: "Spiralgalaxie (Sternenspuren)",
  name_en: "Spiral Galaxy (Star Trails)",
  init() {
    visualizerState.smoothedSpiralGalaxy = new Array(200).fill(0);
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.smoothedSpiralGalaxy) this.init();
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.45;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const time = Date.now() * 0.0005;
    const arms = 4;
    const pointsPerArm = 50;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    withSafeCanvasState(ctx, () => {
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.2);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, 0.4)`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      for (let arm = 0; arm < arms; arm++) {
        for (let i = 0; i < pointsPerArm; i++) {
          const globalIndex = arm * pointsPerArm + i;
          const freqIndex = Math.floor((i / pointsPerArm) * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / pointsPerArm));
          const amplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;
          const boostedAmplitude = Math.max(0.25, amplitude * 1.5);
          const targetIntensity = boostedAmplitude * intensity;

          visualizerState.smoothedSpiralGalaxy[globalIndex] =
            visualizerState.smoothedSpiralGalaxy[globalIndex] * 0.7 + targetIntensity * 0.3;
          const currentIntensity = visualizerState.smoothedSpiralGalaxy[globalIndex];

          const t = i / pointsPerArm;
          const radius = 30 + t * (maxRadius - 30) * (0.5 + currentIntensity * 0.5);
          const spiralTightness = 3;
          const angle = arm * (2 * Math.PI / arms) + t * spiralTightness * Math.PI + time;

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const baseSize = 3 + t * 4;
          const size = (baseSize + currentIntensity * 8) * intensity;
          const hue = (baseHsl.h + t * 60 + arm * 30) % 360;

          if (currentIntensity > 0.4) {
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 8 + currentIntensity * 12;
          }

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + currentIntensity * 20)}%, ${0.6 + currentIntensity * 0.4})`;
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    });
  }
};

export const bloomingMandala = {
  name_de: "Blühendes Mandala",
  name_en: "Blooming Mandala",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerX = width / 2;
    const centerY = height / 2;
    const numSegments = 24;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

      for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);

        const freqIndex = Math.floor((i / numSegments) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] / 255) * 1.5 + 0.3;
        const petalLength = (80 + amplitude * (Math.min(width, height) * 0.35)) * intensity;
        const petalWidth = (20 + overallEnergy * 60) * intensity;
        const hue = (baseHsl.h + i * (360 / numSegments)) % 360;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(petalWidth, petalLength * 0.4, petalWidth * 0.5, petalLength * 0.8, 0, petalLength);
        ctx.bezierCurveTo(-petalWidth * 0.5, petalLength * 0.8, -petalWidth, petalLength * 0.4, 0, 0);

        const gradient = ctx.createLinearGradient(0, 0, 0, petalLength);
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + 20)}%, 0.7)`);
        gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.5 + amplitude * 0.5})`;
        ctx.lineWidth = (2 + amplitude * 3) * intensity;
        ctx.stroke();

        ctx.restore();
      }

      const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * intensity);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 80%, ${0.8 + overallEnergy * 0.2})`);
      centerGlow.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, 50 * intensity, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();
    });
  }
};

export const frequencyBlossoms = {
  name_de: "Frequenz-Blüten (Dynamischer Beat)",
  name_en: "Frequency Blossoms (Dynamic Beat)",
  init(width, height) {
    visualizerState.freqBlossom = {
      rotation: 0,
      smoothedEnergy: 0,
      petalLengths: new Array(24).fill(0)
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.freqBlossom) this.init(width, height);
    const state = visualizerState.freqBlossom;
    const baseHsl = hexToHsl(color);
    const centerX = width / 2;
    const centerY = height / 2;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    state.smoothedEnergy = state.smoothedEnergy * 0.85 + bassEnergy * 0.15;
    state.rotation += 0.01 + bassEnergy * 0.03;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
    ctx.fillRect(0, 0, width, height);

    const numPetals = 24;
    const baseRadius = Math.min(width, height) * 0.15;
    const maxRadius = Math.min(width, height) * 0.4;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(state.rotation);

      const glowRadius = baseRadius + state.smoothedEnergy * maxRadius * 0.5;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius * 1.5);
      glow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.3 + bassEnergy * 0.3})`);
      glow.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${0.1 + bassEnergy * 0.2})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      for (let p = 0; p < numPetals; p++) {
        const freqIndex = Math.floor((p / numPetals) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        const targetLength = baseRadius + amplitude * (maxRadius - baseRadius);
        state.petalLengths[p] = state.petalLengths[p] * 0.7 + targetLength * 0.3;

        const angle = (p / numPetals) * Math.PI * 2;
        const length = state.petalLengths[p] * intensity;

        const x1 = Math.cos(angle) * length;
        const y1 = Math.sin(angle) * length;
        const cp1x = Math.cos(angle + 0.2) * length * 0.6;
        const cp1y = Math.sin(angle + 0.2) * length * 0.6;
        const cp2x = Math.cos(angle - 0.2) * length * 0.6;
        const cp2y = Math.sin(angle - 0.2) * length * 0.6;

        const hue = (baseHsl.h + p * (360 / numPetals) + midEnergy * 30) % 360;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
        ctx.quadraticCurveTo(cp2x, cp2y, 0, 0);

        const petalGradient = ctx.createLinearGradient(0, 0, x1, y1);
        petalGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
        petalGradient.addColorStop(0.7, `hsla(${hue}, 100%, 60%, ${0.4 + amplitude * 0.4})`);
        petalGradient.addColorStop(1, `hsla(${hue}, 100%, 80%, ${0.6 + amplitude * 0.4})`);
        ctx.fillStyle = petalGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${0.5 + amplitude * 0.5})`;
        ctx.lineWidth = (2 + amplitude * 4) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10 + amplitude * 15;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      const coreRadius = 15 + state.smoothedEnergy * 25;
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
      coreGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 95%, 1)`);
      coreGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 70%, 0.8)`);
      coreGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    });
  }
};

export const centralGlowBlossom = {
  name_de: "Zentrale Leuchtblüte (Vibrierend)",
  name_en: "Central Glow Blossom (Vibrating)",
  init(width, height) {
    visualizerState.centralBlossom = {
      rotation: 0,
      pulse: 0,
      rayLengths: new Array(32).fill(0)
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.centralBlossom) this.init(width, height);
    const state = visualizerState.centralBlossom;
    const baseHsl = hexToHsl(color);
    const centerX = width / 2;
    const centerY = height / 2;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    state.rotation += 0.005 + midEnergy * 0.02;
    state.pulse += 0.08 + bassEnergy * 0.1;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + bassEnergy * 0.03})`;
    ctx.fillRect(0, 0, width, height);

    const numRays = 32;
    const baseRadius = 50 + Math.sin(state.pulse) * 20;
    const maxRadius = Math.min(width, height) * 0.45;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);

      for (let layer = 3; layer >= 0; layer--) {
        const layerRadius = (baseRadius + bassEnergy * 100) * (1 + layer * 0.5);
        const layerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
        const hue = (baseHsl.h + layer * 20) % 360;
        layerGlow.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.15 - layer * 0.03})`);
        layerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = layerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(state.rotation);

      for (let r = 0; r < numRays; r++) {
        const freqIndex = Math.floor((r / numRays) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        const vibration = Math.sin(state.pulse + r * 0.3) * 0.2;
        const targetLength = baseRadius + (0.3 + amplitude * 0.7 + vibration) * (maxRadius - baseRadius);
        state.rayLengths[r] = state.rayLengths[r] * 0.75 + targetLength * 0.25;

        const angle = (r / numRays) * Math.PI * 2;
        const length = state.rayLengths[r] * intensity;

        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;

        const hue = (baseHsl.h + r * (180 / numRays) + highEnergy * 40) % 360;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);

        const rayGradient = ctx.createLinearGradient(0, 0, x, y);
        rayGradient.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`);
        rayGradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.5 + amplitude * 0.4})`);
        rayGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.3 + amplitude * 0.5})`);

        ctx.strokeStyle = rayGradient;
        ctx.lineWidth = (3 + amplitude * 6) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 8 + amplitude * 12;
        ctx.stroke();

        if (amplitude > 0.3) {
          ctx.beginPath();
          ctx.arc(x, y, 3 + amplitude * 5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 85%, ${0.5 + amplitude * 0.5})`;
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;

      const coreSize = 20 + bassEnergy * 30 + Math.sin(state.pulse * 2) * 10;
      const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 2);
      coreGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 100%, 1)`);
      coreGlow.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 80%, 0.9)`);
      coreGlow.addColorStop(0.7, `hsla(${baseHsl.h}, 100%, 60%, 0.4)`);
      coreGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, coreSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();
    });
  }
};

export const fluidWaves = {
  name_de: "Fluid-Wellen",
  name_en: "Fluid Waves",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numWaves = 5;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const time = Date.now() * 0.001;

    if (!visualizerState.smoothedFluidWaves || visualizerState.smoothedFluidWaves.length !== numWaves) {
      visualizerState.smoothedFluidWaves = new Array(numWaves).fill(0);
    }

    ctx.clearRect(0, 0, w, h);

    for (let wave = 0; wave < numWaves; wave++) {
      const freqPerWave = maxFreqIndex / numWaves;
      const s = Math.floor(wave * freqPerWave);
      const e = Math.max(s + 1, Math.floor((wave + 1) * freqPerWave));
      const amplitude = averageRange(dataArray, s, e) / 255;

      visualizerState.smoothedFluidWaves[wave] = visualizerState.smoothedFluidWaves[wave] * 0.8 + amplitude * 0.2;
      const smoothedAmp = visualizerState.smoothedFluidWaves[wave];

      const baseY = h * (0.3 + (wave / numWaves) * 0.5);
      const waveHeight = 50 + smoothedAmp * 100;

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 5) {
        const y = baseY + Math.sin((x * 0.01) + time * (1 + wave * 0.3) + wave) * waveHeight * intensity;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();

      const hue = (baseHsl.h + wave * 30) % 360;
      const gradient = ctx.createLinearGradient(0, baseY - waveHeight, 0, h);
      gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.4 + smoothedAmp * 0.4})`);
      gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${Math.max(20, baseHsl.l - 20)}%, 0.1)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
};

export const cellGrowth = {
  name_de: "Zellwachstum",
  name_en: "Cell Growth",
  init(width, height) {
    visualizerState.cellGrowth = {
      cells: [],
      nextSpawn: 0
    };

    const baseHue = Math.random() * 360;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = Math.min(width, height) * 0.2;
      visualizerState.cellGrowth.cells.push({
        x: width / 2 + Math.cos(angle) * distance * (0.3 + Math.random() * 0.7),
        y: height / 2 + Math.sin(angle) * distance * (0.3 + Math.random() * 0.7),
        radius: 8 + Math.random() * 10,
        targetRadius: 25 + Math.random() * 20,
        hue: (baseHue + i * 45 + Math.random() * 20) % 360,
        age: 0,
        maxAge: 300 + Math.random() * 200,
        generation: 0
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.cellGrowth) this.init(width, height);
    const state = visualizerState.cellGrowth;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

    const now = Date.now();
    const spawnThreshold = 0.15;
    const maxCells = 100;
    const spawnCooldown = 30;

    if (overallEnergy > spawnThreshold && now > state.nextSpawn && state.cells.length < maxCells) {
      const useParent = state.cells.length > 0 && Math.random() > 0.3;

      if (useParent) {
        const parentIdx = Math.floor(Math.random() * state.cells.length);
        const parent = state.cells[parentIdx];

        const angle = Math.random() * Math.PI * 2;
        const distance = parent.radius * (1.2 + Math.random());

        state.cells.push({
          x: Math.max(50, Math.min(width - 50, parent.x + Math.cos(angle) * distance)),
          y: Math.max(50, Math.min(height - 50, parent.y + Math.sin(angle) * distance)),
          radius: 5,
          targetRadius: 20 + overallEnergy * 30,
          hue: (parent.hue + 15 + Math.random() * 30) % 360,
          age: 0,
          maxAge: 200 + Math.random() * 150,
          generation: parent.generation + 1
        });
      } else {
        state.cells.push({
          x: 100 + Math.random() * (width - 200),
          y: 100 + Math.random() * (height - 200),
          radius: 5,
          targetRadius: 25 + overallEnergy * 25,
          hue: (baseHsl.h + Math.random() * 60) % 360,
          age: 0,
          maxAge: 250 + Math.random() * 150,
          generation: 0
        });
      }

      state.nextSpawn = now + spawnCooldown / intensity;
    }

    for (let i = state.cells.length - 1; i >= 0; i--) {
      const cell = state.cells[i];
      cell.age++;

      if (cell.radius < cell.targetRadius) {
        cell.radius += (cell.targetRadius - cell.radius) * 0.05 * (1 + bassEnergy * 2) * intensity;
      }

      const lifeProgress = cell.age / cell.maxAge;
      if (lifeProgress >= 1) {
        state.cells.splice(i, 1);
        continue;
      }

      const pulsePhase = Math.sin(cell.age * 0.1 + cell.generation) * 0.15;
      const displayRadius = cell.radius * (1 + pulsePhase + overallEnergy * 0.2) * intensity;
      const alpha = lifeProgress > 0.7 ? (1 - lifeProgress) / 0.3 : 1;

      withSafeCanvasState(ctx, () => {
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, displayRadius * 1.3, 0, Math.PI * 2);
        const outerGradient = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, displayRadius * 1.3);
        outerGradient.addColorStop(0, `hsla(${cell.hue}, 70%, 50%, 0)`);
        outerGradient.addColorStop(0.7, `hsla(${cell.hue}, 70%, 50%, ${0.15 * alpha})`);
        outerGradient.addColorStop(1, `hsla(${cell.hue}, 70%, 50%, ${0.3 * alpha})`);
        ctx.fillStyle = outerGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cell.x, cell.y, displayRadius, 0, Math.PI * 2);
        const cellGradient = ctx.createRadialGradient(
          cell.x - displayRadius * 0.3, cell.y - displayRadius * 0.3, 0,
          cell.x, cell.y, displayRadius
        );
        cellGradient.addColorStop(0, `hsla(${cell.hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + 20)}%, ${alpha})`);
        cellGradient.addColorStop(0.5, `hsla(${cell.hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha})`);
        cellGradient.addColorStop(1, `hsla(${cell.hue}, ${Math.max(40, baseHsl.s - 20)}%, ${Math.max(30, baseHsl.l - 10)}%, ${alpha})`);
        ctx.fillStyle = cellGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cell.x, cell.y, displayRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(cell.hue + 30) % 360}, 80%, 70%, ${alpha})`;
        ctx.fill();

        const organelleCount = 3 + cell.generation;
        for (let j = 0; j < organelleCount; j++) {
          const angle = (j / organelleCount) * Math.PI * 2 + cell.age * 0.02;
          const distance = displayRadius * 0.5;
          const ox = cell.x + Math.cos(angle) * distance;
          const oy = cell.y + Math.sin(angle) * distance;

          ctx.beginPath();
          ctx.arc(ox, oy, displayRadius * 0.1, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(cell.hue + 60) % 360}, 70%, 60%, ${alpha * 0.7})`;
          ctx.fill();
        }
      });
    }

    withSafeCanvasState(ctx, () => {
      const connectionDistance = Math.min(width, height) * 0.15;

      for (let i = 0; i < state.cells.length; i++) {
        for (let j = i + 1; j < state.cells.length; j++) {
          const cell1 = state.cells[i];
          const cell2 = state.cells[j];

          const dx = cell1.x - cell2.x;
          const dy = cell1.y - cell2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance && Math.abs(cell1.generation - cell2.generation) <= 1) {
            const alpha = (1 - dist / connectionDistance) * 0.3;

            ctx.beginPath();
            ctx.moveTo(cell1.x, cell1.y);
            ctx.lineTo(cell2.x, cell2.y);

            const avgHue = (cell1.hue + cell2.hue) / 2;
            ctx.strokeStyle = `hsla(${avgHue}, 70%, 60%, ${alpha})`;
            ctx.lineWidth = 1 * intensity;
            ctx.stroke();
          }
        }
      }
    });
  }
};

export const fractalTree = {
  name_de: "Fraktaler Baum",
  name_en: "Fractal Tree",
  init(width, height) {
    visualizerState.fractalTree = {
      smoothedBass: 0,
      smoothedMid: 0,
      smoothedHigh: 0,
      time: 0
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.fractalTree) this.init(width, height);
    const state = visualizerState.fractalTree;
    const baseHsl = hexToHsl(color);

    state.time += 0.01;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    state.smoothedBass = state.smoothedBass * 0.9 + bassEnergy * 0.1;
    state.smoothedMid = state.smoothedMid * 0.9 + midEnergy * 0.1;
    state.smoothedHigh = state.smoothedHigh * 0.9 + highEnergy * 0.1;

    const drawBranch = (x, y, length, angle, depth, energy) => {
      if (depth === 0 || length < 2) return;

      const pulse = 1 + Math.sin(state.time * 2 + depth * 0.5) * energy * 0.3;
      const effectiveLength = length * pulse * intensity;

      const endX = x + Math.cos(angle) * effectiveLength;
      const endY = y + Math.sin(angle) * effectiveLength;

      const thickness = (depth / 2) * (1 + energy * 0.5) * intensity;

      const depthProgress = 1 - depth / 8;
      const hue = (baseHsl.h + depthProgress * 80 + state.smoothedHigh * 40) % 360;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${30 + depthProgress * 50}%)`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      if (energy > 0.5 && depth < 5) {
        ctx.shadowColor = `hsl(${hue}, ${baseHsl.s}%, 70%)`;
        ctx.shadowBlur = energy * 15 * intensity;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (depth <= 2) {
        const leafSize = (3 + state.smoothedHigh * 8) * intensity;
        ctx.beginPath();
        ctx.arc(endX, endY, leafSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue + 30) % 360}, 100%, 60%, ${0.6 + state.smoothedHigh * 0.4})`;
        ctx.fill();

        if (state.smoothedHigh > 0.5) {
          ctx.shadowColor = `hsl(${(hue + 30) % 360}, 100%, 70%)`;
          ctx.shadowBlur = 10 * intensity;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      const angleVariation = (Math.PI / 6) * (1 + state.smoothedMid * 0.5);
      const lengthReduction = 0.67 + state.smoothedBass * 0.1;
      const branchEnergy = energy * 0.9 + state.smoothedMid * 0.1;

      drawBranch(endX, endY, effectiveLength * lengthReduction, angle - angleVariation, depth - 1, branchEnergy);
      drawBranch(endX, endY, effectiveLength * lengthReduction, angle + angleVariation, depth - 1, branchEnergy);

      if (state.smoothedBass > 0.6 && depth > 4 && Math.random() > 0.7) {
        drawBranch(endX, endY, effectiveLength * lengthReduction * 0.8, angle + (Math.random() - 0.5) * angleVariation * 0.5, depth - 1, branchEnergy);
      }
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, width, height);

    withSafeCanvasState(ctx, () => {
      const startX = width / 2;
      const startY = height * 0.9;
      const initialLength = Math.min(width, height) * 0.15;
      const initialAngle = -Math.PI / 2;
      const maxDepth = 8;
      const energy = (state.smoothedBass + state.smoothedMid + state.smoothedHigh) / 3;

      const trunkHeight = initialLength * 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY - trunkHeight);
      ctx.strokeStyle = `hsl(${baseHsl.h}, ${Math.max(20, baseHsl.s - 30)}%, ${Math.max(20, baseHsl.l - 20)}%)`;
      ctx.lineWidth = (8 + state.smoothedBass * 4) * intensity;
      ctx.stroke();

      const rootCount = 5;
      for (let i = 0; i < rootCount; i++) {
        const rootAngle = Math.PI / 2 + (i - rootCount / 2) * 0.3;
        const rootLength = trunkHeight * 0.4;
        const rootEndX = startX + Math.cos(rootAngle) * rootLength;
        const rootEndY = startY + Math.sin(rootAngle) * rootLength;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          startX + (rootEndX - startX) * 0.5,
          startY + (rootEndY - startY) * 0.3,
          rootEndX,
          rootEndY
        );
        ctx.strokeStyle = `hsl(${baseHsl.h}, ${Math.max(20, baseHsl.s - 30)}%, ${Math.max(15, baseHsl.l - 25)}%)`;
        ctx.lineWidth = (4 - i * 0.5) * intensity;
        ctx.stroke();
      }

      drawBranch(startX, startY - trunkHeight, initialLength, initialAngle, maxDepth, energy);
    });
  }
};

export const organicVisualizers = {
  spiralGalaxy,
  bloomingMandala,
  frequencyBlossoms,
  centralGlowBlossom,
  fluidWaves,
  cellGrowth,
  fractalTree
};
