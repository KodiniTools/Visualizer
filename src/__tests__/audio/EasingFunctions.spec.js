import { describe, it, expect } from 'vitest';
import {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  bounce,
  elastic,
  punch,
  applyEasing,
  easingMap,
  easingNames
} from '../../lib/audio/EasingFunctions.js';

describe('EasingFunctions', () => {
  describe('linear', () => {
    it('returns input unchanged', () => {
      expect(linear(0)).toBe(0);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(1)).toBe(1);
    });

    it('clamps values to 0-1', () => {
      expect(linear(-0.5)).toBe(0);
      expect(linear(1.5)).toBe(1);
    });
  });

  describe('easeIn', () => {
    it('starts slow and ends fast', () => {
      const midValue = easeIn(0.5);
      expect(midValue).toBeLessThan(0.5);
    });

    it('returns 0 at start and 1 at end', () => {
      expect(easeIn(0)).toBe(0);
      expect(easeIn(1)).toBe(1);
    });
  });

  describe('easeOut', () => {
    it('starts fast and ends slow', () => {
      const midValue = easeOut(0.5);
      expect(midValue).toBeGreaterThan(0.5);
    });

    it('returns 0 at start and 1 at end', () => {
      expect(easeOut(0)).toBe(0);
      expect(easeOut(1)).toBe(1);
    });
  });

  describe('easeInOut', () => {
    it('is slow at both ends', () => {
      const quarterValue = easeInOut(0.25);
      const threeQuarterValue = easeInOut(0.75);

      expect(quarterValue).toBeLessThan(0.25);
      expect(threeQuarterValue).toBeGreaterThan(0.75);
    });

    it('returns 0 at start and 1 at end', () => {
      expect(easeInOut(0)).toBe(0);
      expect(easeInOut(1)).toBe(1);
    });
  });

  describe('bounce', () => {
    it('returns values in valid range', () => {
      for (let t = 0; t <= 1; t += 0.1) {
        const result = bounce(t);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1.1); // Small overshoot possible
      }
    });

    it('returns 0 at start and ~1 at end', () => {
      expect(bounce(0)).toBe(0);
      expect(bounce(1)).toBeCloseTo(1, 2);
    });
  });

  describe('elastic', () => {
    it('overshoots and oscillates', () => {
      // Elastic can go slightly above 1
      const nearEnd = elastic(0.8);
      expect(nearEnd).toBeGreaterThan(0.9);
    });

    it('returns 0 at start and 1 at end', () => {
      expect(elastic(0)).toBe(0);
      expect(elastic(1)).toBe(1);
    });
  });

  describe('punch', () => {
    it('has quick attack', () => {
      const earlyValue = punch(0.2);
      expect(earlyValue).toBeGreaterThan(0.2);
    });

    it('returns 0 at start', () => {
      expect(punch(0)).toBe(0);
    });
  });

  describe('applyEasing', () => {
    it('applies named easing function', () => {
      expect(applyEasing(0.5, 'linear')).toBe(0.5);
      expect(applyEasing(0.5, 'easeIn')).toBeLessThan(0.5);
      expect(applyEasing(0.5, 'easeOut')).toBeGreaterThan(0.5);
    });

    it('defaults to linear for unknown easing', () => {
      expect(applyEasing(0.5, 'unknownEasing')).toBe(0.5);
    });

    it('defaults to linear when no easing specified', () => {
      expect(applyEasing(0.5)).toBe(0.5);
    });
  });

  describe('easingMap', () => {
    it('contains all easing functions', () => {
      expect(easingMap).toHaveProperty('linear');
      expect(easingMap).toHaveProperty('easeIn');
      expect(easingMap).toHaveProperty('easeOut');
      expect(easingMap).toHaveProperty('easeInOut');
      expect(easingMap).toHaveProperty('bounce');
      expect(easingMap).toHaveProperty('elastic');
      expect(easingMap).toHaveProperty('punch');
    });

    it('all entries are functions', () => {
      for (const [name, fn] of Object.entries(easingMap)) {
        expect(typeof fn).toBe('function');
      }
    });
  });

  describe('easingNames', () => {
    it('contains all easing function names', () => {
      expect(easingNames).toContain('linear');
      expect(easingNames).toContain('easeIn');
      expect(easingNames).toContain('easeOut');
      expect(easingNames).toContain('bounce');
      expect(easingNames).toContain('elastic');
      expect(easingNames).toContain('punch');
    });

    it('matches keys in easingMap', () => {
      expect(easingNames).toEqual(Object.keys(easingMap));
    });
  });
});
