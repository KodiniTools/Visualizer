/**
 * Cell Growth visualizer - Living cells that divide and grow
 * @module visualizers/organic/cellGrowth
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

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

    // Single save/restore for all cells instead of per-cell
    withSafeCanvasState(ctx, () => {
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

        // Outer glow
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, displayRadius * 1.3, 0, Math.PI * 2);
        const outerGradient = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, displayRadius * 1.3);
        outerGradient.addColorStop(0, `hsla(${cell.hue}, 70%, 50%, 0)`);
        outerGradient.addColorStop(0.7, `hsla(${cell.hue}, 70%, 50%, ${0.15 * alpha})`);
        outerGradient.addColorStop(1, `hsla(${cell.hue}, 70%, 50%, ${0.3 * alpha})`);
        ctx.fillStyle = outerGradient;
        ctx.fill();

        // Cell body
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

        // Nucleus
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, displayRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(cell.hue + 30) % 360}, 80%, 70%, ${alpha})`;
        ctx.fill();

        // Organelles
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
      }
    });

    // Draw connections in batch
    withSafeCanvasState(ctx, () => {
      const connectionDistance = Math.min(width, height) * 0.15;
      ctx.lineWidth = 1 * intensity;

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
            ctx.stroke();
          }
        }
      }
    });
  }
};
