/**
 * Shard Mosaic visualizer - Triangular shard pattern with frequency-based coloring
 * @module visualizers/geometric/shardMosaic
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  applySmoothValue
} from '../core/index.js';

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
