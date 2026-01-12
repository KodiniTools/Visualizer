import { describe, it, expect } from 'vitest';
import {
  EFFECT_NAMES,
  EFFECT_CATEGORIES,
  calculateEffectValue,
  getMotionOffset,
  getFilterString,
  AudioReactiveEffects
} from '../../lib/audio/AudioReactiveEffects.js';

describe('AudioReactiveEffects', () => {
  describe('EFFECT_NAMES', () => {
    it('contains all 24 effects', () => {
      expect(EFFECT_NAMES).toHaveLength(24);
    });

    it('includes filter effects', () => {
      expect(EFFECT_NAMES).toContain('hue');
      expect(EFFECT_NAMES).toContain('brightness');
      expect(EFFECT_NAMES).toContain('blur');
    });

    it('includes motion effects', () => {
      expect(EFFECT_NAMES).toContain('shake');
      expect(EFFECT_NAMES).toContain('bounce');
      expect(EFFECT_NAMES).toContain('orbit');
    });
  });

  describe('EFFECT_CATEGORIES', () => {
    it('categorizes effects correctly', () => {
      expect(EFFECT_CATEGORIES.filter).toContain('hue');
      expect(EFFECT_CATEGORIES.transform).toContain('scale');
      expect(EFFECT_CATEGORIES.visual).toContain('glow');
      expect(EFFECT_CATEGORIES.motion).toContain('bounce');
    });
  });

  describe('calculateEffectValue', () => {
    describe('filter effects', () => {
      it('calculates hue effect', () => {
        const result = calculateEffectValue('hue', 0.5);
        expect(result).toHaveProperty('hueRotate');
        expect(result.hueRotate).toBe(360); // 0.5 * 720
      });

      it('calculates brightness effect', () => {
        const result = calculateEffectValue('brightness', 0.5);
        expect(result).toHaveProperty('brightness');
        expect(result.brightness).toBe(120); // 60 + 0.5 * 120
      });

      it('calculates blur effect', () => {
        const result = calculateEffectValue('blur', 0.5);
        expect(result).toHaveProperty('blur');
        expect(result.blur).toBe(5); // 0.5 * 10
      });
    });

    describe('transform effects', () => {
      it('calculates scale effect', () => {
        const result = calculateEffectValue('scale', 0.5);
        expect(result).toHaveProperty('scale');
        expect(result.scale).toBe(1.25); // 1.0 + 0.5 * 0.5
      });

      it('calculates rotation effect', () => {
        const result = calculateEffectValue('rotation', 0.5);
        expect(result).toHaveProperty('rotation');
        expect(typeof result.rotation).toBe('number');
      });
    });

    describe('motion effects', () => {
      it('calculates shake effect when level > 0.2', () => {
        const result = calculateEffectValue('shake', 0.5);
        expect(result).toHaveProperty('shakeX');
        expect(result).toHaveProperty('shakeY');
      });

      it('returns zero shake when level <= 0.2', () => {
        const result = calculateEffectValue('shake', 0.1);
        expect(result.shakeX).toBe(0);
        expect(result.shakeY).toBe(0);
      });

      it('calculates bounce effect', () => {
        const result = calculateEffectValue('bounce', 0.5);
        expect(result).toHaveProperty('bounceY');
        expect(result.bounceY).toBeLessThanOrEqual(0); // Negative = up
      });

      it('calculates orbit effect', () => {
        const result = calculateEffectValue('orbit', 0.5);
        expect(result).toHaveProperty('orbitX');
        expect(result).toHaveProperty('orbitY');
      });
    });

    describe('visual effects', () => {
      it('calculates glow effect', () => {
        const result = calculateEffectValue('glow', 0.5);
        expect(result).toHaveProperty('glowBlur');
        expect(result).toHaveProperty('glowColor');
        expect(result.glowBlur).toBe(25); // 0.5 * 50
      });

      it('calculates strobe effect', () => {
        // High level - should flash
        const highResult = calculateEffectValue('strobe', 0.8);
        expect(highResult).toHaveProperty('strobeOpacity');
        expect(highResult).toHaveProperty('strobeBrightness');
        expect(highResult.strobeBrightness).toBeGreaterThan(150);

        // Low level - normal
        const lowResult = calculateEffectValue('strobe', 0.2);
        expect(lowResult.strobeOpacity).toBe(1);
      });
    });

    it('returns empty object for unknown effect', () => {
      const result = calculateEffectValue('unknownEffect', 0.5);
      expect(result).toEqual({});
    });

    it('clamps normalized level to 0-1', () => {
      const highResult = calculateEffectValue('scale', 2.0);
      expect(highResult.scale).toBe(1.5); // Max scale

      const lowResult = calculateEffectValue('scale', -0.5);
      expect(lowResult.scale).toBe(1.0); // Min scale
    });
  });

  describe('getMotionOffset', () => {
    it('combines multiple motion effects', () => {
      const effects = {
        shakeX: 5,
        shakeY: 3,
        bounceY: -10,
        swingX: 8
      };

      const offset = getMotionOffset(effects);
      expect(offset.x).toBe(13); // 5 + 8
      expect(offset.y).toBe(-7); // 3 + (-10)
    });

    it('returns zero for empty effects', () => {
      const offset = getMotionOffset({});
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });
  });

  describe('getFilterString', () => {
    it('creates CSS filter string', () => {
      const effects = {
        hueRotate: 180,
        brightness: 120,
        blur: 5
      };

      const filterString = getFilterString(effects);
      expect(filterString).toContain('hue-rotate(180deg)');
      expect(filterString).toContain('brightness(120%)');
      expect(filterString).toContain('blur(5px)');
    });

    it('returns empty string for no filter effects', () => {
      const filterString = getFilterString({});
      expect(filterString).toBe('');
    });

    it('skips zero-value filters', () => {
      const effects = {
        blur: 0,
        grayscale: 0
      };

      const filterString = getFilterString(effects);
      expect(filterString).toBe('');
    });
  });

  describe('AudioReactiveEffects class', () => {
    let effects;

    beforeEach(() => {
      effects = new AudioReactiveEffects();
    });

    it('calculates all enabled effects', () => {
      const config = {
        hue: { enabled: true, intensity: 80 },
        scale: { enabled: true, intensity: 50 },
        blur: { enabled: false, intensity: 100 }
      };

      const result = effects.calculateAll(config, 0.5);

      expect(result).toHaveProperty('hueRotate');
      expect(result).toHaveProperty('scale');
      expect(result).not.toHaveProperty('blur');
    });

    it('stores last calculated effects', () => {
      const config = {
        hue: { enabled: true, intensity: 100 }
      };

      effects.calculateAll(config, 0.5);
      const lastEffects = effects.getLastEffects();

      expect(lastEffects).toHaveProperty('hueRotate');
    });

    it('identifies motion effects', () => {
      expect(effects.isMotionEffect('bounce')).toBe(true);
      expect(effects.isMotionEffect('hue')).toBe(false);
    });

    it('identifies filter effects', () => {
      expect(effects.isFilterEffect('hue')).toBe(true);
      expect(effects.isFilterEffect('bounce')).toBe(false);
    });
  });
});
