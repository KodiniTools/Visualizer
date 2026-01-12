/**
 * Neural Network visualizer - Simulated neuron firing effect
 * @module visualizers/tech/neuralNetwork
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

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
