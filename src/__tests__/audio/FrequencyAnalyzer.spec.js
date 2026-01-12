import { describe, it, expect, beforeEach } from 'vitest';
import { FrequencyAnalyzer, DEFAULT_CONFIG } from '../../lib/audio/FrequencyAnalyzer.js';

describe('FrequencyAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new FrequencyAnalyzer();
  });

  describe('constructor', () => {
    it('creates analyzer with default config', () => {
      expect(analyzer.config).toEqual(DEFAULT_CONFIG);
    });

    it('accepts custom config', () => {
      const customConfig = { bassGain: 2.0 };
      const customAnalyzer = new FrequencyAnalyzer(customConfig);
      expect(customAnalyzer.config.bassGain).toBe(2.0);
    });

    it('initializes smoothed values to zero', () => {
      expect(analyzer.smoothBass).toBe(0);
      expect(analyzer.smoothMid).toBe(0);
      expect(analyzer.smoothTreble).toBe(0);
      expect(analyzer.smoothVolume).toBe(0);
    });
  });

  describe('analyze', () => {
    it('returns null for empty input', () => {
      expect(analyzer.analyze(null, 0)).toBeNull();
      expect(analyzer.analyze(new Uint8Array(0), 0)).toBeNull();
    });

    it('analyzes FFT data correctly', () => {
      // Create mock FFT data with known values
      const bufferLength = 1024;
      const audioData = new Uint8Array(bufferLength);

      // Fill bass range with high values
      for (let i = 0; i < 77; i++) { // ~15% of 512 (usable length)
        audioData[i] = 200;
      }

      // Fill mid range
      for (let i = 77; i < 179; i++) { // 15-35% of 512
        audioData[i] = 150;
      }

      // Fill treble range
      for (let i = 179; i < 512; i++) { // 35-100% of 512
        audioData[i] = 100;
      }

      const result = analyzer.analyze(audioData, bufferLength);

      expect(result).not.toBeNull();
      expect(result.bass).toBeGreaterThan(0);
      expect(result.mid).toBeGreaterThan(0);
      expect(result.treble).toBeGreaterThan(0);
      expect(result.volume).toBeGreaterThan(0);
    });

    it('returns smoothed values', () => {
      const bufferLength = 1024;
      const audioData = new Uint8Array(bufferLength).fill(128);

      const result = analyzer.analyze(audioData, bufferLength);

      expect(result).toHaveProperty('smoothBass');
      expect(result).toHaveProperty('smoothMid');
      expect(result).toHaveProperty('smoothTreble');
      expect(result).toHaveProperty('smoothVolume');
    });

    it('applies smoothing over multiple frames', () => {
      const bufferLength = 1024;

      // First frame with high values
      const highData = new Uint8Array(bufferLength).fill(255);
      analyzer.analyze(highData, bufferLength);

      // Second frame with low values
      const lowData = new Uint8Array(bufferLength).fill(0);
      const result = analyzer.analyze(lowData, bufferLength);

      // Smoothed values should be between 0 and previous values
      expect(result.smoothBass).toBeGreaterThan(0);
      expect(result.bass).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets all smoothed values to zero', () => {
      // First analyze some data
      const audioData = new Uint8Array(1024).fill(128);
      analyzer.analyze(audioData, 1024);

      // Then reset
      analyzer.reset();

      expect(analyzer.smoothBass).toBe(0);
      expect(analyzer.smoothMid).toBe(0);
      expect(analyzer.smoothTreble).toBe(0);
      expect(analyzer.smoothVolume).toBe(0);
    });
  });

  describe('getSmoothedValues', () => {
    it('returns current smoothed values', () => {
      const audioData = new Uint8Array(1024).fill(128);
      analyzer.analyze(audioData, 1024);

      const smoothed = analyzer.getSmoothedValues();

      expect(smoothed).toHaveProperty('smoothBass');
      expect(smoothed).toHaveProperty('smoothMid');
      expect(smoothed).toHaveProperty('smoothTreble');
      expect(smoothed).toHaveProperty('smoothVolume');
    });
  });

  describe('updateConfig', () => {
    it('merges new config values', () => {
      analyzer.updateConfig({ bassGain: 3.0 });
      expect(analyzer.config.bassGain).toBe(3.0);
      // Other values should remain
      expect(analyzer.config.midGain).toBe(DEFAULT_CONFIG.midGain);
    });
  });
});
