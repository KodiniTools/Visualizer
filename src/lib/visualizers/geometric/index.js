/**
 * Geometric visualizers - Circles, grids, and geometric patterns
 * @module visualizers/geometric
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  applySmoothValue,
  withSafeCanvasState
} from '../core/index.js';

export const circles = {
  name_de: "Kreise (Dynamisch)",
  name_en: "Circles (Dynamic)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numCircles = 10;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 * 0.9;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    if (visualizerState.smoothedCircles.length !== numCircles) {
      visualizerState.smoothedCircles = new Array(numCircles).fill(0);
    }

    withSafeCanvasState(ctx, () => {
      for (let i = numCircles - 1; i >= 0; i--) {
        const freqPerCircle = maxFreqIndex / numCircles;
        const s = Math.floor(i * freqPerCircle);
        const e = Math.max(s + 1, Math.floor((i + 1) * freqPerCircle));

        const rawAmplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(i, numCircles);

        const baseRadius = ((numCircles - i) / numCircles) * maxRadius;
        const targetRadius = baseRadius * (1 + rawAmplitude * dynamicGain * 0.5);
        visualizerState.smoothedCircles[i] = applySmoothValue(visualizerState.smoothedCircles[i] || 0, targetRadius, 0.4);

        const currentRadius = visualizerState.smoothedCircles[i] * intensity;
        const hue = (baseHsl.h + (i / numCircles) * 120) % 360;

        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.6 + rawAmplitude * 0.4})`;
        ctx.lineWidth = (3 + rawAmplitude * dynamicGain * 6) * intensity;
        ctx.stroke();

        if (rawAmplitude > 0.3) {
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = rawAmplitude * 20 * intensity;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    });
  }
};

export const vibratingCubes = {
  name_de: "3D Frequenz-Raster (Boost)",
  name_en: "3D Frequency Grid (Boost)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const rows = 12, cols = 16;
    const cubeWidth = w / cols;
    const cubeHeight = h / rows;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const totalCubes = rows * cols;

    if (!visualizerState.smooth3DBars || visualizerState.smooth3DBars.length !== totalCubes) {
      visualizerState.smooth3DBars = new Array(totalCubes).fill(0);
    }

    withSafeCanvasState(ctx, () => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const flatIndex = row * cols + col;
          const freqPos = col / cols;
          const freqIndex = Math.floor(freqPos * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / cols));
          const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

          const dynamicGain = calculateDynamicGain(col, cols) * 2;
          const targetHeight = rawAmplitude * dynamicGain * intensity;
          visualizerState.smooth3DBars[flatIndex] = visualizerState.smooth3DBars[flatIndex] * 0.6 + targetHeight * 0.4;

          const currentVal = visualizerState.smooth3DBars[flatIndex];
          if (currentVal < 0.03) continue;

          const x = col * cubeWidth + cubeWidth * 0.1;
          const y = row * cubeHeight + cubeHeight * 0.1;
          const size = cubeWidth * 0.8;

          const hue = (baseHsl.h + col * (120 / cols) + currentVal * 60) % 360;
          const lightness = 30 + currentVal * 50;
          const alpha = 0.3 + currentVal * 0.7;

          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${lightness}%, ${alpha})`;
          ctx.fillRect(x, y, size, size);

          if (currentVal > 0.5) {
            ctx.strokeStyle = `hsla(${hue}, 100%, ${70 + currentVal * 20}%, ${currentVal})`;
            ctx.lineWidth = 2 * intensity;
            ctx.strokeRect(x, y, size, size);
          }
        }
      }
    });
  }
};

export const rainbowCube = {
  name_de: "Regenbogen-Würfel",
  name_en: "Rainbow Cube",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const size = Math.min(w, h) * 0.4;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const energy = averageRange(dataArray, 0, maxFreqIndex) / 255;
    const time = Date.now() * 0.001;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.5 + energy);

      const faces = [
        { offset: { x: 0, y: -size * 0.3 }, scale: 1 + energy * 0.3 },
        { offset: { x: -size * 0.25, y: size * 0.15 }, scale: 0.9 + energy * 0.2 },
        { offset: { x: size * 0.25, y: size * 0.15 }, scale: 0.9 + energy * 0.2 }
      ];

      faces.forEach((face, i) => {
        const hue = (baseHsl.h + i * 120 + time * 50) % 360;
        const faceSize = size * face.scale * intensity;

        ctx.beginPath();
        ctx.rect(face.offset.x - faceSize / 2, face.offset.y - faceSize / 2, faceSize, faceSize);

        const gradient = ctx.createLinearGradient(
          face.offset.x - faceSize / 2,
          face.offset.y - faceSize / 2,
          face.offset.x + faceSize / 2,
          face.offset.y + faceSize / 2
        );
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.7 + energy * 0.3})`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 40%, ${0.5 + energy * 0.3})`);

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.8})`;
        ctx.lineWidth = 2 * intensity;
        ctx.stroke();
      });
    });
  }
};

export const hexagonGrid = {
  name_de: "Sechseck-Gitter",
  name_en: "Hexagon Grid",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const hexSize = 30;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const cols = Math.floor(width / (hexWidth * 0.75)) + 1;
    const rows = Math.floor(height / hexHeight) + 1;
    const baseHsl = hexToHsl(color);
    withSafeCanvasState(ctx, () => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * hexWidth * 0.75;
          const y = row * hexHeight + (col % 2) * hexHeight * 0.5;
          const normalizedX = x / width;
          const normalizedY = y / height;
          const freqIndex = Math.floor((normalizedX + normalizedY) * 0.5 * bufferLength);
          const amplitude = (dataArray[freqIndex] || 0) / 255;
          if (amplitude > 0.1) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              const hx = x + Math.cos(angle) * hexSize;
              const hy = y + Math.sin(angle) * hexSize;
              if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            const hue = (baseHsl.h + amplitude * 180) % 360;
            ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${30 + amplitude * 50}%, ${amplitude})`;
            ctx.fill();
            ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${60 + amplitude * 30}%)`;
            ctx.lineWidth = (1 + amplitude * 2) * intensity;
            ctx.stroke();
          }
        }
      }
    });
  }
};

export const neonGrid = {
  name_de: "Neon-Gitter",
  name_en: "Neon Grid",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    const horizon = height * 0.35 + bassEnergy * 50 * intensity;
    const vanishingPointX = width / 2;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `hsla(${(baseHsl.h + 180) % 360}, 60%, ${5 + bassEnergy * 5}%, 1)`);
    bgGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 50%, 3%, 1)`);
    bgGradient.addColorStop(1, 'black');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const time = Date.now() * 0.001;

    withSafeCanvasState(ctx, () => {
      const numHLines = 20;
      const scrollOffset = (time * 50 * (1 + bassEnergy)) % (height / numHLines);

      for (let i = 0; i < numHLines; i++) {
        const baseProgress = i / numHLines;
        const progress = baseProgress + scrollOffset / height;
        if (progress > 1) continue;

        const y = horizon + progress * progress * (height - horizon);
        const freqIndex = Math.floor(baseProgress * maxFreqIndex);
        const freq = (dataArray[freqIndex] || 0) / 255;
        const wave = Math.sin(time * 3 + i * 0.5) * freq * 20 * intensity;

        ctx.beginPath();
        ctx.moveTo(0, y + wave);
        ctx.lineTo(width, y + wave);

        const alpha = 0.3 + (1 - progress) * 0.6 + freq * 0.2;
        const lightness = 50 + (1 - progress) * 30 + midEnergy * 20;
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = (2 + (1 - progress) * 4 + freq * 3) * intensity;
        ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 60%)`;
        ctx.shadowBlur = 5 + bassEnergy * 10;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      const numVLines = 25;
      for (let i = 0; i <= numVLines; i++) {
        const progress = i / numVLines;
        const freqIndex = Math.floor(progress * maxFreqIndex);
        const freq = (dataArray[freqIndex] || 0) / 255;

        const startX = progress * width;
        const startY = height + freq * 20;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(vanishingPointX, horizon - 30 - bassEnergy * 30);

        const centerDistance = Math.abs(progress - 0.5) * 2;
        const alpha = (1 - centerDistance * 0.6) * (0.3 + freq * 0.5);
        const hue = (baseHsl.h + 40 + freq * 30) % 360;

        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + freq * 40}%, ${alpha})`;
        ctx.lineWidth = (1 + freq * 3) * intensity;
        ctx.stroke();
      }

      if (bassEnergy > 0.2) {
        const glowGradient = ctx.createRadialGradient(
          vanishingPointX, horizon, 0,
          vanishingPointX, horizon, 150 + bassEnergy * 100
        );
        glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${bassEnergy * 0.4})`);
        glowGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${bassEnergy * 0.2})`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
      }
    });
  }
};

export const shardMosaic = {
  name_de: "Scherben-Mosaik",
  name_en: "Shard Mosaic",
  init(width, height) {
    const cols = 20, rows = 12;
    const cellWidth = width / cols, cellHeight = height / rows;
    visualizerState.shardTriangles = [];
    visualizerState.shardMosaic = { lastWidth: width, lastHeight: height };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = { x: c * cellWidth, y: r * cellHeight }, p2 = { x: (c + 1) * cellWidth, y: r * cellHeight };
        const p3 = { x: c * cellWidth, y: (r + 1) * cellHeight }, p4 = { x: (c + 1) * cellWidth, y: (r + 1) * cellHeight };
        visualizerState.shardTriangles.push({ points: [p1, p2, p3], smoothedVal: 0 });
        visualizerState.shardTriangles.push({ points: [p2, p4, p3], smoothedVal: 0 });
      }
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.shardMosaic || visualizerState.shardTriangles.length === 0 || visualizerState.shardMosaic.lastWidth !== width || visualizerState.shardMosaic.lastHeight !== height) {
      this.init(width, height);
    }
    const baseHsl = hexToHsl(color);
    visualizerState.shardTriangles.forEach((tri) => {
      const centerX = (tri.points[0].x + tri.points[1].x + tri.points[2].x) / 3;
      const normalizedX = centerX / width;
      const [s, e] = rangeForBar(Math.floor(normalizedX * 100), 100, bufferLength);
      const targetVal = averageRange(dataArray, s, e) / 255;
      tri.smoothedVal = applySmoothValue(tri.smoothedVal, targetVal, 0.4);
      if (tri.smoothedVal > CONSTANTS.MIN_VISIBLE_AMPLITUDE) {
        ctx.beginPath(); ctx.moveTo(tri.points[0].x, tri.points[0].y); ctx.lineTo(tri.points[1].x, tri.points[1].y); ctx.lineTo(tri.points[2].x, tri.points[2].y); ctx.closePath();
        ctx.fillStyle = `hsl(${(baseHsl.h + normalizedX * 60) % 360}, ${baseHsl.s}%, ${20 + tri.smoothedVal * 50}%)`;
        ctx.fill();
      }
    });
  }
};

export const geometricKaleidoscope = {
  name_de: "Geometrisches Kaleidoskop",
  name_en: "Geometric Kaleidoscope",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerX = width / 2, centerY = height / 2;
    const numSegments = 8, numLayers = 6;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(Date.now() * 0.0003);
      for (let layer = 0; layer < numLayers; layer++) {
        const layerProgress = layer / numLayers;
        const freqPerLayer = maxFreqIndex / numLayers;
        const s = Math.floor(layer * freqPerLayer);
        const e = Math.max(s + 1, Math.floor((layer + 1) * freqPerLayer));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(layer, numLayers);
        const effectiveAmplitude = amplitude * dynamicGain * intensity;
        const baseRadius = 50 + layer * 40;
        const radius = baseRadius + effectiveAmplitude * 120;
        for (let i = 0; i < numSegments; i++) {
          const angle = (i / numSegments) * Math.PI * 2;
          const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
          const x1 = Math.cos(angle) * radius, y1 = Math.sin(angle) * radius;
          const x2 = Math.cos(nextAngle) * radius, y2 = Math.sin(nextAngle) * radius;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
          const hue = (baseHsl.h + layerProgress * 120 + i * 15) % 360;
          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${40 + effectiveAmplitude * 50}%, ${0.5 + effectiveAmplitude * 0.5})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + effectiveAmplitude * 30}%)`;
          ctx.lineWidth = (2 + effectiveAmplitude * 5) * intensity;
          ctx.stroke();
        }
      }
    });
  }
};

export const geometricVisualizers = {
  circles,
  vibratingCubes,
  rainbowCube,
  hexagonGrid,
  neonGrid,
  shardMosaic,
  geometricKaleidoscope
};
