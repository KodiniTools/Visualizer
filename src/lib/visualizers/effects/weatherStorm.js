/**
 * Weather Storm visualizer - Dynamic snowfall and rain driven by audio
 * @module visualizers/effects/weatherStorm
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

/**
 * Precipitation particle class for snow/rain
 */
class PrecipitationParticle {
  constructor(width, height, isSnow) {
    this.width = width;
    this.height = height;
    this.isSnow = isSnow;
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * this.width;
    this.y = initial ? Math.random() * this.height : -20;
    this.z = Math.random(); // Depth for parallax

    if (this.isSnow) {
      this.size = 2 + Math.random() * 4 + this.z * 3;
      this.vy = 0.5 + Math.random() * 1.5 + this.z * 1;
      this.vx = 0;
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.03;
      this.wobbleAmount = 0.5 + Math.random() * 1;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.05;
      this.opacity = 0.4 + this.z * 0.5;
    } else {
      // Rain
      this.size = 1 + Math.random() * 2;
      this.length = 10 + Math.random() * 20 + this.z * 15;
      this.vy = 8 + Math.random() * 8 + this.z * 6;
      this.vx = 0;
      this.opacity = 0.3 + this.z * 0.4;
    }
  }

  update(windForce, intensity, speedMult) {
    if (this.isSnow) {
      // Snow has gentle wobble
      this.wobblePhase += this.wobbleSpeed;
      this.vx = Math.sin(this.wobblePhase) * this.wobbleAmount + windForce * (0.5 + this.z * 0.5);
      this.x += this.vx;
      this.y += this.vy * speedMult * (0.5 + intensity * 0.5);
      this.rotation += this.rotationSpeed;
    } else {
      // Rain is more affected by wind
      this.vx = windForce * (1 + this.z);
      this.x += this.vx;
      this.y += this.vy * speedMult;
    }

    // Wrap around edges
    if (this.x < -50) this.x = this.width + 50;
    if (this.x > this.width + 50) this.x = -50;

    // Reset if below screen
    if (this.y > this.height + 50) {
      this.reset();
      return true; // Splash possible
    }
    return false;
  }
}

/**
 * Splash particle for rain impacts
 */
class SplashParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -Math.random() * 3 - 1;
    this.life = 1.0;
    this.size = 1 + Math.random() * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // Gravity
    this.life -= 0.05;
    return this.life > 0;
  }
}

export const weatherStorm = {
  name_de: "Wettersturm",
  name_en: "Weather Storm",

  init(width, height) {
    const particleCount = 400;
    const particles = [];

    // Start with snow mode
    for (let i = 0; i < particleCount; i++) {
      particles.push(new PrecipitationParticle(width, height, true));
    }

    visualizerState.weatherStorm = {
      particles,
      splashes: [],
      isSnow: true,
      modeTimer: 0,
      transitionProgress: 0,
      width,
      height,
      smoothedBass: 0,
      smoothedMid: 0,
      smoothedHigh: 0,
      windAccumulator: 0,
      lightningTimer: 0,
      lightningFlash: 0
    };
  },

  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.weatherStorm) {
      this.init(width, height);
    }

    const state = visualizerState.weatherStorm;
    const baseHsl = hexToHsl(color);

    // Analyze frequency bands
    const maxFreqIndex = Math.floor(bufferLength * 0.5);
    const bassRaw = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.2)) / 255;
    const midRaw = averageRange(dataArray, Math.floor(maxFreqIndex * 0.2), Math.floor(maxFreqIndex * 0.6)) / 255;
    const highRaw = averageRange(dataArray, Math.floor(maxFreqIndex * 0.6), maxFreqIndex) / 255;

    // Smooth values
    state.smoothedBass += (bassRaw - state.smoothedBass) * 0.2;
    state.smoothedMid += (midRaw - state.smoothedMid) * 0.15;
    state.smoothedHigh += (highRaw - state.smoothedHigh) * 0.1;

    const bass = state.smoothedBass;
    const mid = state.smoothedMid;
    const high = state.smoothedHigh;
    const overallEnergy = (bass * 0.4 + mid * 0.4 + high * 0.2);

    // Mode switching based on sustained energy
    state.modeTimer += 0.016;
    if (state.modeTimer > 8 + Math.random() * 4) {
      state.modeTimer = 0;
      const shouldBeRain = overallEnergy > 0.4;
      if (shouldBeRain !== !state.isSnow) {
        state.isSnow = !shouldBeRain;
        // Transition particles
        state.particles.forEach(p => {
          p.isSnow = state.isSnow;
          if (state.isSnow) {
            p.size = 2 + Math.random() * 4 + p.z * 3;
            p.vy = 0.5 + Math.random() * 1.5 + p.z * 1;
            p.wobblePhase = Math.random() * Math.PI * 2;
            p.wobbleSpeed = 0.02 + Math.random() * 0.03;
            p.wobbleAmount = 0.5 + Math.random() * 1;
          } else {
            p.size = 1 + Math.random() * 2;
            p.length = 10 + Math.random() * 20 + p.z * 15;
            p.vy = 8 + Math.random() * 8 + p.z * 6;
          }
        });
      }
    }

    // Calculate wind based on audio
    state.windAccumulator += (mid - 0.5) * 0.1;
    state.windAccumulator *= 0.98;
    const windForce = state.windAccumulator * 5 + Math.sin(state.modeTimer) * 0.5;

    // Lightning on strong bass hits
    state.lightningTimer += 0.016;
    if (!state.isSnow && bass > 0.7 && state.lightningTimer > 0.5) {
      state.lightningFlash = 1.0;
      state.lightningTimer = 0;
    }
    state.lightningFlash *= 0.85;

    // Clear canvas with appropriate background
    if (state.isSnow) {
      // Snowy night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, `hsla(${(baseHsl.h + 180) % 360}, 30%, ${10 + mid * 5}%, 1)`);
      skyGrad.addColorStop(1, `hsla(${(baseHsl.h + 200) % 360}, 25%, ${15 + bass * 5}%, 1)`);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Stormy sky
      const stormGrad = ctx.createLinearGradient(0, 0, 0, height);
      const flashBoost = state.lightningFlash * 40;
      stormGrad.addColorStop(0, `hsla(${(baseHsl.h + 200) % 360}, 40%, ${8 + flashBoost}%, 1)`);
      stormGrad.addColorStop(0.5, `hsla(${(baseHsl.h + 210) % 360}, 35%, ${12 + bass * 5 + flashBoost}%, 1)`);
      stormGrad.addColorStop(1, `hsla(${(baseHsl.h + 220) % 360}, 30%, ${15 + flashBoost}%, 1)`);
      ctx.fillStyle = stormGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw lightning bolt
    if (state.lightningFlash > 0.3) {
      this.drawLightning(ctx, width, height, state.lightningFlash, baseHsl);
    }

    // Speed multiplier based on energy
    const speedMult = 0.7 + overallEnergy * 0.8;

    // Update and draw particles
    state.particles.forEach(p => {
      const hitGround = p.update(windForce, overallEnergy * intensity, speedMult);

      if (p.isSnow) {
        this.drawSnowflake(ctx, p, baseHsl, intensity);
      } else {
        this.drawRaindrop(ctx, p, windForce, baseHsl, intensity);

        // Create splash on impact
        if (hitGround && Math.random() < 0.3) {
          state.splashes.push(new SplashParticle(p.x, height));
        }
      }
    });

    // Update and draw splashes
    state.splashes = state.splashes.filter(splash => {
      const alive = splash.update();
      if (alive) {
        ctx.beginPath();
        ctx.arc(splash.x, splash.y, splash.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHsl.h}, 50%, 70%, ${splash.life * 0.5})`;
        ctx.fill();
      }
      return alive;
    });

    // Limit splash count
    if (state.splashes.length > 100) {
      state.splashes = state.splashes.slice(-100);
    }

    // Draw ground accumulation
    if (state.isSnow) {
      this.drawSnowGround(ctx, width, height, bass, baseHsl);
    } else {
      this.drawWetGround(ctx, width, height, bass, baseHsl);
    }
  },

  drawSnowflake(ctx, p, baseHsl, intensity) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    const alpha = p.opacity * (0.7 + intensity * 0.3);
    const hue = (baseHsl.h + 180 + p.z * 20) % 360;

    // Glow
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
    glow.addColorStop(0, `hsla(${hue}, 20%, 95%, ${alpha})`);
    glow.addColorStop(0.5, `hsla(${hue}, 30%, 90%, ${alpha * 0.5})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(-p.size * 2, -p.size * 2, p.size * 4, p.size * 4);

    // Snowflake shape (6-pointed)
    ctx.strokeStyle = `hsla(${hue}, 30%, 98%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
    }
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 20%, 100%, ${alpha})`;
    ctx.fill();

    ctx.restore();
  },

  drawRaindrop(ctx, p, windForce, baseHsl, intensity) {
    const alpha = p.opacity * (0.5 + intensity * 0.5);
    const hue = (baseHsl.h + 200) % 360;

    // Calculate angle based on wind
    const angle = Math.atan2(p.vy, windForce) - Math.PI / 2;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // Rain streak
    const gradient = ctx.createLinearGradient(0, -p.length, 0, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, `hsla(${hue}, 50%, 80%, ${alpha * 0.3})`);
    gradient.addColorStop(1, `hsla(${hue}, 60%, 90%, ${alpha})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = p.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -p.length);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.restore();
  },

  drawLightning(ctx, width, height, flash, baseHsl) {
    const startX = width * 0.3 + Math.random() * width * 0.4;
    let x = startX;
    let y = 0;

    ctx.strokeStyle = `hsla(${baseHsl.h}, 80%, ${80 + flash * 20}%, ${flash})`;
    ctx.lineWidth = 2 + flash * 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = `hsla(${baseHsl.h}, 100%, 90%, ${flash})`;
    ctx.shadowBlur = 20 * flash;

    ctx.beginPath();
    ctx.moveTo(x, y);

    while (y < height * 0.7) {
      x += (Math.random() - 0.5) * 60;
      y += 20 + Math.random() * 40;
      ctx.lineTo(x, y);

      // Branch
      if (Math.random() < 0.2) {
        const branchX = x + (Math.random() - 0.5) * 80;
        const branchY = y + 30 + Math.random() * 50;
        ctx.moveTo(x, y);
        ctx.lineTo(branchX, branchY);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  drawSnowGround(ctx, width, height, bass, baseHsl) {
    const snowHeight = 30 + bass * 20;
    const gradient = ctx.createLinearGradient(0, height - snowHeight, 0, height);
    gradient.addColorStop(0, `hsla(${(baseHsl.h + 180) % 360}, 20%, 95%, 0.3)`);
    gradient.addColorStop(0.5, `hsla(${(baseHsl.h + 180) % 360}, 15%, 98%, 0.6)`);
    gradient.addColorStop(1, `hsla(${(baseHsl.h + 180) % 360}, 10%, 100%, 0.8)`);

    // Wavy snow surface
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      const waveY = height - snowHeight + Math.sin(x * 0.02 + bass * 5) * 10;
      ctx.lineTo(x, waveY);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  },

  drawWetGround(ctx, width, height, bass, baseHsl) {
    // Reflective wet surface
    const wetHeight = 20 + bass * 15;
    const gradient = ctx.createLinearGradient(0, height - wetHeight, 0, height);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, `hsla(${(baseHsl.h + 200) % 360}, 30%, 20%, 0.3)`);
    gradient.addColorStop(1, `hsla(${(baseHsl.h + 200) % 360}, 40%, 15%, 0.6)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - wetHeight, width, wetHeight);

    // Ripples on the ground
    for (let i = 0; i < 5; i++) {
      const rippleX = (i * 0.2 + bass * 0.1) * width;
      const rippleSize = 10 + bass * 20;
      ctx.beginPath();
      ctx.ellipse(rippleX, height - 5, rippleSize, rippleSize * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${baseHsl.h}, 50%, 70%, ${0.2 - i * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  cleanup() {
    if (visualizerState.weatherStorm) {
      visualizerState.weatherStorm.particles = [];
      visualizerState.weatherStorm.splashes = [];
      delete visualizerState.weatherStorm;
    }
  }
};
