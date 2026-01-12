/**
 * Fractal Tree visualizer - Audio-reactive branching tree structure
 * @module visualizers/organic/fractalTree
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

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

    // Collect glow effects for batch rendering
    const glowEffects = [];

    const drawBranch = (x, y, length, angle, depth, energy) => {
      if (depth === 0 || length < 2) return;

      const pulse = 1 + Math.sin(state.time * 2 + depth * 0.5) * energy * 0.3;
      const effectiveLength = length * pulse * intensity;

      const endX = x + Math.cos(angle) * effectiveLength;
      const endY = y + Math.sin(angle) * effectiveLength;

      const thickness = (depth / 2) * (1 + energy * 0.5) * intensity;

      const depthProgress = 1 - depth / 8;
      const hue = (baseHsl.h + depthProgress * 80 + state.smoothedHigh * 40) % 360;

      // Draw branch line
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${30 + depthProgress * 50}%)`;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Collect glow effects instead of immediate drawing
      if (energy > 0.5 && depth < 5) {
        glowEffects.push({ x, y, endX, endY, hue, energy, thickness });
      }

      // Draw leaves
      if (depth <= 2) {
        const leafSize = (3 + state.smoothedHigh * 8) * intensity;
        ctx.beginPath();
        ctx.arc(endX, endY, leafSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue + 30) % 360}, 100%, 60%, ${0.6 + state.smoothedHigh * 0.4})`;
        ctx.fill();

        if (state.smoothedHigh > 0.5) {
          glowEffects.push({ isLeaf: true, x: endX, y: endY, leafSize, hue });
        }
      }

      // Recursive branches
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

      // Draw trunk
      const trunkHeight = initialLength * 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY - trunkHeight);
      ctx.strokeStyle = `hsl(${baseHsl.h}, ${Math.max(20, baseHsl.s - 30)}%, ${Math.max(20, baseHsl.l - 20)}%)`;
      ctx.lineWidth = (8 + state.smoothedBass * 4) * intensity;
      ctx.stroke();

      // Draw roots
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

      // Draw branches (this populates glowEffects)
      drawBranch(startX, startY - trunkHeight, initialLength, initialAngle, maxDepth, energy);

      // Batch render all glow effects at once
      if (glowEffects.length > 0) {
        ctx.shadowBlur = 0;

        for (const effect of glowEffects) {
          if (effect.isLeaf) {
            ctx.shadowColor = `hsl(${(effect.hue + 30) % 360}, 100%, 70%)`;
            ctx.shadowBlur = 10 * intensity;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.leafSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(effect.hue + 30) % 360}, 100%, 60%, 0.8)`;
            ctx.fill();
          } else {
            ctx.shadowColor = `hsl(${effect.hue}, ${baseHsl.s}%, 70%)`;
            ctx.shadowBlur = effect.energy * 15 * intensity;
            ctx.beginPath();
            ctx.moveTo(effect.x, effect.y);
            ctx.lineTo(effect.endX, effect.endY);
            ctx.lineWidth = effect.thickness;
            ctx.stroke();
          }
        }

        ctx.shadowBlur = 0;
      }
    });
  }
};
