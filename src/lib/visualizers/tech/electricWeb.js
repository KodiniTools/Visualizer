/**
 * Electric Web visualizer - Lightning-like connections between nodes
 * @module visualizers/tech/electricWeb
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const electricWeb = {
  name_de: "Elektrisches Netz",
  name_en: "Electric Web",
  init(width, height) {
    const numNodes = 30;
    visualizerState.electricWeb = {
      nodes: [],
      maxDistSq: Math.pow(width / 5, 2)
    };
    for (let i = 0; i < numNodes; i++) {
      visualizerState.electricWeb.nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        charge: 0.3 + Math.random() * 0.3
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.electricWeb) this.init(width, height);
    const state = visualizerState.electricWeb;
    const baseHsl = hexToHsl(color);
    const nodes = state.nodes;
    const numNodes = nodes.length;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), maxFreqIndex) / 255;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const speedMult = 1 + bassEnergy * 2.5;
    const maxDist = width / 5 + bassEnergy * 30;
    const maxDistSq = maxDist * maxDist;

    ctx.lineWidth = (1 + midEnergy * 2) * intensity;

    for (let i = 0; i < numNodes; i++) {
      const nodeA = nodes[i];

      for (let j = i + 1; j < numNodes; j++) {
        const nodeB = nodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxDistSq) continue;

        const dist = Math.sqrt(distSq);
        const distFactor = 1 - dist / maxDist;
        const charge = (nodeA.charge + nodeB.charge) * 0.5;

        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);

        const jitterStrength = charge * 25 * intensity;
        const segX = dx / 6;
        const segY = dy / 6;

        for (let k = 1; k < 6; k++) {
          const jx = (Math.random() - 0.5) * jitterStrength;
          const jy = (Math.random() - 0.5) * jitterStrength;
          ctx.lineTo(nodeA.x + segX * k + jx, nodeA.y + segY * k + jy);
        }
        ctx.lineTo(nodeB.x, nodeB.y);

        const alpha = distFactor * (0.4 + charge * 0.5);
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, ${55 + charge * 35}%, ${alpha})`;
        ctx.stroke();
      }
    }

    for (let i = 0; i < numNodes; i++) {
      const node = nodes[i];
      const freqIndex = Math.floor((i / numNodes) * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;
      node.charge = 0.3 + amplitude * 0.6;

      node.x += node.vx * speedMult;
      node.y += node.vy * speedMult;

      if (node.x < 0) { node.x = 0; node.vx *= -1; }
      else if (node.x > width) { node.x = width; node.vx *= -1; }
      if (node.y < 0) { node.y = 0; node.vy *= -1; }
      else if (node.y > height) { node.y = height; node.vy *= -1; }

      const nodeSize = (3 + node.charge * 8) * intensity;

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 60%, ${node.charge * 0.25})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${baseHsl.h}, 100%, ${65 + node.charge * 30}%, ${0.8 + node.charge * 0.2})`;
      ctx.fill();
    }

    if (bassEnergy > 0.6 && Math.random() > 0.9) {
      const src = nodes[Math.floor(Math.random() * numNodes)];
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      let sx = src.x, sy = src.y;
      const angle = Math.random() * Math.PI * 2;
      for (let i = 0; i < 4; i++) {
        sx += Math.cos(angle + (Math.random() - 0.5) * 0.8) * 30;
        sy += Math.sin(angle + (Math.random() - 0.5) * 0.8) * 30;
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 85%, ${bassEnergy})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};
