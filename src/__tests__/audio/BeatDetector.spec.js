import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeatDetector, DEFAULT_CONFIG } from '../../lib/audio/BeatDetector.js';

describe('BeatDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BeatDetector();
  });

  describe('constructor', () => {
    it('creates detector with default config', () => {
      expect(detector.config).toEqual(DEFAULT_CONFIG);
    });

    it('accepts custom config', () => {
      const customConfig = { beatThreshold: 0.6 };
      const customDetector = new BeatDetector(customConfig);
      expect(customDetector.config.beatThreshold).toBe(0.6);
    });

    it('initializes state correctly', () => {
      expect(detector.lastLevel).toBe(0);
      expect(detector.lastBeatTime).toBe(0);
      expect(detector.beatHistory).toEqual([]);
      expect(detector.beatConfidence).toBe(0);
    });
  });

  describe('detect', () => {
    it('returns beat detection result object', () => {
      const result = detector.detect(128, 1000);

      expect(result).toHaveProperty('isBeat');
      expect(result).toHaveProperty('beatIntensity');
      expect(result).toHaveProperty('timeSinceLastBeat');
      expect(result).toHaveProperty('bpm');
      expect(result).toHaveProperty('beatConfidence');
    });

    it('detects beat on significant rise', () => {
      // Start with low level
      detector.detect(0, 1000);

      // Jump to high level (above threshold 0.45 * 255 = 115)
      const result = detector.detect(200, 1200);

      expect(result.isBeat).toBe(true);
      expect(result.beatIntensity).toBeGreaterThan(0);
    });

    it('does not detect beat without significant rise', () => {
      // Already high level
      detector.detect(200, 1000);

      // Similar level
      const result = detector.detect(210, 1200);

      expect(result.isBeat).toBe(false);
    });

    it('respects minimum beat interval', () => {
      // First beat
      detector.detect(0, 1000);
      detector.detect(200, 1100);

      // Too soon for next beat (< 150ms)
      detector.detect(0, 1150);
      const result = detector.detect(200, 1200);

      expect(result.isBeat).toBe(false);
    });

    it('allows beat after minimum interval', () => {
      // First beat
      detector.detect(0, 1000);
      detector.detect(200, 1100);

      // Wait for minimum interval
      detector.detect(0, 1300);
      const result = detector.detect(200, 1400);

      expect(result.isBeat).toBe(true);
    });
  });

  describe('BPM calculation', () => {
    it('calculates BPM after sufficient beats', () => {
      // Simulate regular beats at 120 BPM (500ms intervals)
      let time = 0;
      for (let i = 0; i < 5; i++) {
        detector.detect(0, time);
        detector.detect(200, time + 100);
        time += 500;
      }

      const stats = detector.getStats();
      expect(stats.bpm).toBeCloseTo(120, -1); // Within 10%
    });

    it('returns 0 BPM with insufficient history', () => {
      detector.detect(0, 1000);
      detector.detect(200, 1100);

      const stats = detector.getStats();
      expect(stats.bpm).toBe(0);
    });
  });

  describe('beat confidence', () => {
    it('increases confidence with consistent intervals', () => {
      // Simulate very regular beats
      let time = 0;
      for (let i = 0; i < 8; i++) {
        detector.detect(0, time);
        detector.detect(200, time + 50);
        time += 500;
      }

      expect(detector.beatConfidence).toBeGreaterThan(0.5);
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      // Create some state
      detector.detect(0, 1000);
      detector.detect(200, 1100);

      // Reset
      detector.reset();

      expect(detector.lastLevel).toBe(0);
      expect(detector.lastBeatTime).toBe(0);
      expect(detector.beatHistory).toEqual([]);
      expect(detector.beatConfidence).toBe(0);
    });
  });

  describe('triggerBeat', () => {
    it('manually triggers a beat', () => {
      const result = detector.triggerBeat(0.8, 1000);

      expect(result.isBeat).toBe(true);
      expect(result.beatIntensity).toBe(0.8);
    });

    it('clamps intensity to 0-1', () => {
      const result = detector.triggerBeat(2.0, 1000);
      expect(result.beatIntensity).toBe(1);

      const result2 = detector.triggerBeat(-0.5, 2000);
      expect(result2.beatIntensity).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('updates configuration', () => {
      detector.updateConfig({ beatThreshold: 0.7 });
      expect(detector.config.beatThreshold).toBe(0.7);
    });
  });
});
