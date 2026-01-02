/**
 * Tech visualizers - Digital, matrix, and network effects
 * @module visualizers/tech
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const matrixRain = {
  name_de: "Matrix-Regen",
  name_en: "Matrix Rain",
  init(width, height) {
    const columns = Math.floor(width / 20);
    visualizerState.matrixRain = {
      columns,
      drops: new Array(columns).fill(0).map(() => ({
        y: Math.random() * -100,
        speed: 2 + Math.random() * 5,
        chars: []
      }))
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.matrixRain) this.init(width, height);
    const state = visualizerState.matrixRain;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    const columnWidth = width / state.columns;
    const charHeight = 20;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

    ctx.font = `${charHeight}px monospace`;

    state.drops.forEach((drop, col) => {
      const freqIndex = Math.floor((col / state.columns) * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;
      const speedMult = 1 + overallEnergy * 3;

      drop.y += drop.speed * speedMult * intensity;

      const x = col * columnWidth + columnWidth / 2;

      for (let i = 0; i < 15; i++) {
        const charY = drop.y - i * charHeight;
        if (charY < 0 || charY > height) continue;

        const fadeAlpha = (1 - i / 15) * (0.5 + amplitude * 0.5);
        const lightness = i === 0 ? 90 : 50 + (1 - i / 15) * 30;
        const hue = (baseHsl.h + amplitude * 30) % 360;

        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${fadeAlpha})`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, charY);
      }

      if (drop.y > height + 300) {
        drop.y = Math.random() * -100;
        drop.speed = 2 + Math.random() * 5;
      }
    });
  }
};

export const digitalRain = {
  name_de: "Digitaler Regen",
  name_en: "Digital Rain",
  init(width, height) {
    const columns = Math.floor(width / 15);
    visualizerState.digitalRain = {
      columns,
      drops: Array.from({ length: columns }, () => ({
        y: Math.random() * height * 2 - height,
        speed: 3 + Math.random() * 6,
        length: 10 + Math.floor(Math.random() * 15),
        hueOffset: Math.random() * 30
      }))
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.digitalRain) this.init(width, height);
    const state = visualizerState.digitalRain;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
    ctx.fillRect(0, 0, width, height);

    const columnWidth = width / state.columns;
    const segmentHeight = 12;

    for (let i = 0; i < state.columns; i++) {
      const freqPos = (i % Math.floor(state.columns / 3)) / (state.columns / 3);
      const freqIndex = Math.floor(freqPos * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;

      const drop = state.drops[i];
      const speedMult = 1 + bassEnergy * 2 + amplitude * 3;
      drop.speed = (4 + amplitude * 8) * intensity;

      const currentLength = Math.floor(drop.length * (0.5 + amplitude * 1.5));
      const hue = (baseHsl.h + drop.hueOffset + midEnergy * 30) % 360;

      for (let j = 0; j < currentLength; j++) {
        const segmentY = drop.y - j * segmentHeight;

        if (segmentY > -segmentHeight && segmentY < height + segmentHeight) {
          const trailFade = 1 - (j / currentLength);
          const x = i * columnWidth + 1;
          const segWidth = columnWidth - 2;

          if (j === 0) {
            const gradient = ctx.createLinearGradient(x, segmentY, x, segmentY + segmentHeight);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.95)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.8)`);
            ctx.fillStyle = gradient;
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 15 + amplitude * 10;
          } else {
            const lightness = 50 + trailFade * 30 + amplitude * 20;
            const alpha = trailFade * (0.5 + amplitude * 0.5);
            ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
            ctx.shadowBlur = 0;
          }

          const radius = 3;
          ctx.beginPath();
          ctx.roundRect(x, segmentY, segWidth, segmentHeight - 2, radius);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;

      drop.y += drop.speed * speedMult;

      if (drop.y - currentLength * segmentHeight > height) {
        drop.y = -drop.length * segmentHeight - Math.random() * 100;
        drop.length = 10 + Math.floor(Math.random() * 15);
      }
    }

    if (midEnergy > 0.4) {
      for (let g = 0; g < 3; g++) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        ctx.beginPath();
        ctx.arc(gx, gy, 2 + midEnergy * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 90%, ${midEnergy * 0.6})`;
        ctx.fill();
      }
    }
  }
};

export const networkPlexus = {
  name_de: "Netzwerk-Plexus",
  name_en: "Network Plexus",
  init(width, height) {
    const numParticles = Math.floor(width / 15);
    visualizerState.networkPlexus = { particles: [], pulsePhase: 0 };
    for (let i = 0; i < numParticles; i++) {
      visualizerState.networkPlexus.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        baseRadius: 3 + Math.random() * 4,
        hueOffset: Math.random() * 40
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.networkPlexus || visualizerState.networkPlexus.particles.length === 0) {
      this.init(width, height);
    }
    const state = visualizerState.networkPlexus;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    state.pulsePhase += 0.05 + bassEnergy * 0.1;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + bassEnergy * 0.05})`;
    ctx.fillRect(0, 0, width, height);

    const speedMult = 1 + bassEnergy * 3 + midEnergy * 2;

    state.particles.forEach((p, index) => {
      p.x += p.vx * speedMult * intensity;
      p.y += p.vy * speedMult * intensity;

      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
        p.vx += (Math.random() - 0.5) * bassEnergy * 2;
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
        p.vy += (Math.random() - 0.5) * bassEnergy * 2;
      }

      const pulse = Math.sin(state.pulsePhase + index * 0.1) * 0.3 + 1;
      const radius = p.baseRadius * pulse * (1 + bassEnergy * 1.5) * intensity;

      const hue = (baseHsl.h + p.hueOffset + midEnergy * 30) % 360;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.9 + highEnergy * 0.1})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.5)`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 90%, 0.9)`;
      ctx.fill();
    });

    const connectDistance = width / 6 + bassEnergy * 50;
    withSafeCanvasState(ctx, () => {
      ctx.lineWidth = (1 + midEnergy * 2) * intensity;

      for (let i = 0; i < state.particles.length; i++) {
        for (let j = i + 1; j < state.particles.length; j++) {
          const dx = state.particles[i].x - state.particles[j].x;
          const dy = state.particles[i].y - state.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * (0.4 + midEnergy * 0.4);
            const hue = (baseHsl.h + (i + j) * 2) % 360;

            ctx.beginPath();
            ctx.moveTo(state.particles[i].x, state.particles[i].y);
            ctx.lineTo(state.particles[j].x, state.particles[j].y);
            ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${alpha})`;
            ctx.stroke();
          }
        }
      }
    });
  }
};

export const neuralNetwork = {
  name_de: "Neuronen-Netz",
  name_en: "Neural Network",
  init(width, height) {
    const numNeurons = 40;
    visualizerState.neuralNetwork = {
      neurons: [],
      signals: []
    };

    for (let i = 0; i < numNeurons; i++) {
      visualizerState.neuralNetwork.neurons.push({
        x: Math.random() * width,
        y: Math.random() * height,
        charge: 0,
        activation: 0,
        lastFire: 0,
        connections: []
      });
    }

    const state = visualizerState.neuralNetwork;
    for (let i = 0; i < state.neurons.length; i++) {
      const connectionCount = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < connectionCount; j++) {
        const target = Math.floor(Math.random() * state.neurons.length);
        if (target !== i) {
          state.neurons[i].connections.push(target);
        }
      }
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.neuralNetwork || visualizerState.neuralNetwork.neurons.length === 0) {
      this.init(width, height);
    }

    const state = visualizerState.neuralNetwork;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, width, height);

    state.neurons.forEach((neuron, index) => {
      const freqPerNeuron = maxFreqIndex / state.neurons.length;
      const s = Math.floor(index * freqPerNeuron);
      const e = Math.max(s + 1, Math.floor((index + 1) * freqPerNeuron));

      const amplitude = averageRange(dataArray, s, e) / 255;
      const dynamicGain = calculateDynamicGain(index, state.neurons.length);

      neuron.charge = amplitude * dynamicGain * intensity;
      neuron.activation *= 0.92;

      const now = Date.now();
      if (neuron.charge > 0.4 && (now - neuron.lastFire) > 200) {
        neuron.activation = 1.0;
        neuron.lastFire = now;

        neuron.connections.forEach(targetIdx => {
          state.signals.push({
            from: index,
            to: targetIdx,
            progress: 0,
            hue: (baseHsl.h + index * 10) % 360
          });
        });
      }
    });

    withSafeCanvasState(ctx, () => {
      for (let i = state.signals.length - 1; i >= 0; i--) {
        const signal = state.signals[i];
        signal.progress += 0.05 * intensity;

        if (signal.progress >= 1) {
          state.neurons[signal.to].activation = Math.min(1, state.neurons[signal.to].activation + 0.5);
          state.signals.splice(i, 1);
          continue;
        }

        const fromNeuron = state.neurons[signal.from];
        const toNeuron = state.neurons[signal.to];

        const x = fromNeuron.x + (toNeuron.x - fromNeuron.x) * signal.progress;
        const y = fromNeuron.y + (toNeuron.y - fromNeuron.y) * signal.progress;

        ctx.beginPath();
        ctx.arc(x, y, 3 * intensity, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${signal.hue}, 100%, 70%)`;
        ctx.shadowColor = `hsl(${signal.hue}, 100%, 70%)`;
        ctx.shadowBlur = 10 * intensity;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    withSafeCanvasState(ctx, () => {
      state.neurons.forEach((neuron, index) => {
        neuron.connections.forEach(targetIdx => {
          const target = state.neurons[targetIdx];
          const alpha = (neuron.activation + target.activation) / 2;

          if (alpha > 0.05) {
            ctx.beginPath();
            ctx.moveTo(neuron.x, neuron.y);
            ctx.lineTo(target.x, target.y);

            const hue = (baseHsl.h + index * 5) % 360;
            ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha * 0.3})`;
            ctx.lineWidth = (1 + alpha * 2) * intensity;
            ctx.stroke();
          }
        });
      });
    });

    state.neurons.forEach((neuron, index) => {
      const baseRadius = 4;
      const activeRadius = baseRadius * (1 + neuron.activation * 2) * intensity;
      const hue = (baseHsl.h + (index / state.neurons.length) * 120) % 360;

      if (neuron.activation > 0.3) {
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, activeRadius * 2, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
          neuron.x, neuron.y, 0,
          neuron.x, neuron.y, activeRadius * 2
        );
        glowGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${neuron.activation * 0.5})`);
        glowGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, activeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${40 + neuron.activation * 50}%)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(neuron.x, neuron.y, activeRadius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + neuron.activation * 30}%)`;
      ctx.fill();
    });
  }
};

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

export const techVisualizers = {
  matrixRain,
  digitalRain,
  networkPlexus,
  neuralNetwork,
  electricWeb
};
