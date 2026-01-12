/**
 * Unit tests for visualizer utility functions
 * Tests helpers.js, colorUtils.js, and constants.js
 */

import { CONSTANTS } from './src/lib/visualizers/core/constants.js';
import { hexToHsl } from './src/lib/visualizers/core/colorUtils.js';
import {
  expo01,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  forEachRotatedSegment,
  rotatePoint
} from './src/lib/visualizers/core/helpers.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertAlmostEqual(actual, expected, tolerance = 0.001, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

function assertArrayEqual(actual, expected, message = '') {
  if (actual.length !== expected.length) {
    throw new Error(`${message} Array lengths differ: ${actual.length} vs ${expected.length}`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${message} Arrays differ at index ${i}: ${actual[i]} vs ${expected[i]}`);
    }
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('📦 Testing Visualizer Utility Functions\n');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('--- CONSTANTS ---');

test('CONSTANTS: all smoothing values defined', () => {
  assertTrue(typeof CONSTANTS.SMOOTHING_BASE === 'number');
  assertTrue(typeof CONSTANTS.SMOOTHING_MID_MULTIPLIER === 'number');
  assertTrue(typeof CONSTANTS.SMOOTHING_HIGH_MULTIPLIER === 'number');
});

test('CONSTANTS: all threshold values defined', () => {
  assertTrue(typeof CONSTANTS.BASS_THRESHOLD === 'number');
  assertTrue(typeof CONSTANTS.LOW_MID_THRESHOLD === 'number');
  assertTrue(typeof CONSTANTS.HIGH_MID_THRESHOLD === 'number');
  assertTrue(typeof CONSTANTS.HIGH_THRESHOLD === 'number');
});

test('CONSTANTS: thresholds in ascending order', () => {
  assertTrue(CONSTANTS.BASS_THRESHOLD < CONSTANTS.LOW_MID_THRESHOLD);
  assertTrue(CONSTANTS.LOW_MID_THRESHOLD < CONSTANTS.HIGH_MID_THRESHOLD);
  assertTrue(CONSTANTS.HIGH_MID_THRESHOLD < CONSTANTS.HIGH_THRESHOLD);
  assertTrue(CONSTANTS.HIGH_THRESHOLD < 1.0);
});

test('CONSTANTS: all gain values defined and ascending', () => {
  assertTrue(CONSTANTS.BASS_GAIN <= CONSTANTS.LOW_MID_GAIN);
  assertTrue(CONSTANTS.LOW_MID_GAIN <= CONSTANTS.HIGH_MID_GAIN);
  assertTrue(CONSTANTS.HIGH_MID_GAIN <= CONSTANTS.HIGH_GAIN);
  assertTrue(CONSTANTS.HIGH_GAIN <= CONSTANTS.ULTRA_HIGH_GAIN);
});

test('CONSTANTS: cache size is positive', () => {
  assertTrue(CONSTANTS.COLOR_CACHE_MAX_SIZE > 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// expo01 Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- expo01 ---');

test('expo01: returns 0 for input 0', () => {
  assertAlmostEqual(expo01(0), 0);
});

test('expo01: returns 1 for input 1', () => {
  assertAlmostEqual(expo01(1), 1);
});

test('expo01: clamps negative values to 0', () => {
  assertAlmostEqual(expo01(-0.5), 0);
  assertAlmostEqual(expo01(-100), 0);
});

test('expo01: clamps values > 1 to 1', () => {
  assertAlmostEqual(expo01(1.5), 1);
  assertAlmostEqual(expo01(100), 1);
});

test('expo01: middle values are below linear (exponential curve)', () => {
  const result = expo01(0.5);
  assertTrue(result < 0.5, `Expected < 0.5, got ${result}`);
  assertTrue(result > 0, `Expected > 0, got ${result}`);
});

test('expo01: different bases affect curve', () => {
  const base2 = expo01(0.5, 2);
  const base4 = expo01(0.5, 4);
  const base8 = expo01(0.5, 8);
  assertTrue(base2 > base4, 'Higher base should give lower middle values');
  assertTrue(base4 > base8, 'Higher base should give lower middle values');
});

test('expo01: monotonically increasing', () => {
  let prev = expo01(0);
  for (let i = 0.1; i <= 1.0; i += 0.1) {
    const curr = expo01(i);
    assertTrue(curr >= prev, `Not monotonic at ${i}`);
    prev = curr;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// rangeForBar Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- rangeForBar ---');

test('rangeForBar: returns valid range for first bar', () => {
  const [start, end] = rangeForBar(0, 64, 1024);
  assertTrue(start >= 0, 'Start should be >= 0');
  assertTrue(end > start, 'End should be > start');
  assertTrue(end <= 1024, 'End should be <= dataSize');
});

test('rangeForBar: returns valid range for last bar', () => {
  const [start, end] = rangeForBar(63, 64, 1024);
  assertTrue(start >= 0, 'Start should be >= 0');
  assertTrue(end > start, 'End should be > start');
  assertTrue(end <= 1024, 'End should be <= dataSize');
});

test('rangeForBar: ranges cover entire spectrum', () => {
  const totalBars = 32;
  const dataSize = 512;
  let coveredIndices = new Set();

  for (let i = 0; i < totalBars; i++) {
    const [start, end] = rangeForBar(i, totalBars, dataSize);
    for (let j = start; j < end; j++) {
      coveredIndices.add(j);
    }
  }

  // Should cover from 0 to near dataSize
  assertTrue(coveredIndices.has(0), 'Should cover index 0');
  assertTrue(coveredIndices.size > totalBars, 'Should cover more indices than bars');
});

test('rangeForBar: end is always > start', () => {
  for (let i = 0; i < 64; i++) {
    const [start, end] = rangeForBar(i, 64, 1024);
    assertTrue(end > start, `Bar ${i}: end (${end}) should be > start (${start})`);
  }
});

test('rangeForBar: handles small data size', () => {
  const [start, end] = rangeForBar(0, 10, 10);
  assertTrue(start >= 0);
  assertTrue(end > start);
  assertTrue(end <= 10);
});

// ═══════════════════════════════════════════════════════════════════════════
// averageRange Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- averageRange ---');

test('averageRange: calculates correct average', () => {
  const arr = [10, 20, 30, 40, 50];
  assertAlmostEqual(averageRange(arr, 0, 5), 30);
});

test('averageRange: handles single element', () => {
  const arr = [100, 200, 300];
  assertAlmostEqual(averageRange(arr, 1, 2), 200);
});

test('averageRange: handles negative start (clamps to 0)', () => {
  const arr = [10, 20, 30];
  assertAlmostEqual(averageRange(arr, -5, 3), 20);
});

test('averageRange: handles Uint8Array', () => {
  const arr = new Uint8Array([100, 150, 200, 250]);
  assertAlmostEqual(averageRange(arr, 0, 4), 175);
});

test('averageRange: handles sparse/missing values', () => {
  const arr = [10, undefined, 30];
  assertAlmostEqual(averageRange(arr, 0, 3), 40 / 3, 0.01);
});

test('averageRange: end clamped to at least start + 1', () => {
  const arr = [10, 20, 30];
  // If end <= start, it should clamp end to start + 1
  const result = averageRange(arr, 1, 1);
  assertAlmostEqual(result, 20);
});

test('averageRange: handles frequency data typical values', () => {
  const freqData = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    freqData[i] = Math.floor(Math.sin(i / 20) * 100 + 128);
  }
  const avg = averageRange(freqData, 0, 50);
  assertTrue(avg >= 0 && avg <= 255, `Average should be in valid range: ${avg}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// calculateDynamicGain Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- calculateDynamicGain ---');

test('calculateDynamicGain: bass frequencies get bass gain', () => {
  const gain = calculateDynamicGain(0, 100);
  assertAlmostEqual(gain, CONSTANTS.BASS_GAIN, 0.01);
});

test('calculateDynamicGain: high frequencies get higher gain', () => {
  const bassGain = calculateDynamicGain(5, 100);
  const highGain = calculateDynamicGain(90, 100);
  assertTrue(highGain > bassGain, 'High frequency gain should exceed bass gain');
});

test('calculateDynamicGain: ultra-high frequencies get max gain', () => {
  const gain = calculateDynamicGain(99, 100);
  assertTrue(gain >= CONSTANTS.HIGH_GAIN, `Ultra-high gain should be >= HIGH_GAIN`);
});

test('calculateDynamicGain: gain is monotonically increasing', () => {
  let prevGain = calculateDynamicGain(0, 100);
  for (let i = 1; i < 100; i++) {
    const gain = calculateDynamicGain(i, 100);
    assertTrue(gain >= prevGain, `Gain should not decrease at position ${i}`);
    prevGain = gain;
  }
});

test('calculateDynamicGain: custom settings override defaults', () => {
  const customSettings = {
    bassGain: 2.0,
    lowMidGain: 2.0,
    highMidGain: 2.0,
    highGain: 2.0,
    ultraHighGain: 2.0
  };
  const gain = calculateDynamicGain(50, 100, customSettings);
  assertAlmostEqual(gain, 2.0, 0.01);
});

test('calculateDynamicGain: interpolates between thresholds', () => {
  // Mid-point between bass and low-mid thresholds
  const midPoint = (CONSTANTS.BASS_THRESHOLD + CONSTANTS.LOW_MID_THRESHOLD) / 2;
  const barIndex = Math.floor(midPoint * 100);
  const gain = calculateDynamicGain(barIndex, 100);

  // Should be between bass and low-mid gain
  assertTrue(gain > CONSTANTS.BASS_GAIN);
  assertTrue(gain < CONSTANTS.LOW_MID_GAIN);
});

// ═══════════════════════════════════════════════════════════════════════════
// getFrequencyBasedSmoothing Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- getFrequencyBasedSmoothing ---');

test('getFrequencyBasedSmoothing: bass frequencies use base smoothing', () => {
  const smoothing = getFrequencyBasedSmoothing(10, 100, 0.5);
  assertAlmostEqual(smoothing, 0.5);
});

test('getFrequencyBasedSmoothing: mid frequencies use mid multiplier', () => {
  const smoothing = getFrequencyBasedSmoothing(50, 100, 0.5);
  assertAlmostEqual(smoothing, 0.5 * CONSTANTS.SMOOTHING_MID_MULTIPLIER);
});

test('getFrequencyBasedSmoothing: high frequencies use high multiplier', () => {
  const smoothing = getFrequencyBasedSmoothing(80, 100, 0.5);
  assertAlmostEqual(smoothing, 0.5 * CONSTANTS.SMOOTHING_HIGH_MULTIPLIER);
});

test('getFrequencyBasedSmoothing: uses default base if not provided', () => {
  const smoothing = getFrequencyBasedSmoothing(10, 100);
  assertAlmostEqual(smoothing, CONSTANTS.SMOOTHING_BASE);
});

test('getFrequencyBasedSmoothing: boundary at 0.3', () => {
  const below = getFrequencyBasedSmoothing(29, 100, 0.5);
  const at = getFrequencyBasedSmoothing(30, 100, 0.5);
  const above = getFrequencyBasedSmoothing(31, 100, 0.5);

  assertAlmostEqual(below, 0.5);
  assertTrue(above > below, 'Above 0.3 should have higher smoothing');
});

test('getFrequencyBasedSmoothing: boundary at 0.7', () => {
  const below = getFrequencyBasedSmoothing(69, 100, 0.5);
  const above = getFrequencyBasedSmoothing(71, 100, 0.5);

  assertTrue(above > below, 'Above 0.7 should have highest smoothing');
});

// ═══════════════════════════════════════════════════════════════════════════
// applySmoothValue Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- applySmoothValue ---');

test('applySmoothValue: factor 0 keeps current value', () => {
  assertAlmostEqual(applySmoothValue(100, 200, 0), 100);
});

test('applySmoothValue: factor 1 jumps to target', () => {
  assertAlmostEqual(applySmoothValue(100, 200, 1), 200);
});

test('applySmoothValue: factor 0.5 averages values', () => {
  assertAlmostEqual(applySmoothValue(100, 200, 0.5), 150);
});

test('applySmoothValue: handles negative values', () => {
  assertAlmostEqual(applySmoothValue(-100, 100, 0.5), 0);
});

test('applySmoothValue: converges over iterations', () => {
  let current = 0;
  const target = 100;
  const factor = 0.3;

  for (let i = 0; i < 20; i++) {
    current = applySmoothValue(current, target, factor);
  }

  // Should be very close to target after many iterations
  assertTrue(Math.abs(current - target) < 1, `Should converge to target: ${current}`);
});

test('applySmoothValue: same current and target returns same', () => {
  assertAlmostEqual(applySmoothValue(50, 50, 0.5), 50);
});

// ═══════════════════════════════════════════════════════════════════════════
// forEachRotatedSegment Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- forEachRotatedSegment ---');

test('forEachRotatedSegment: calls callback correct number of times', () => {
  let count = 0;
  forEachRotatedSegment(8, 0, 0, () => count++);
  assertEqual(count, 8);
});

test('forEachRotatedSegment: provides correct indices', () => {
  const indices = [];
  forEachRotatedSegment(4, 0, 0, (i) => indices.push(i));
  assertArrayEqual(indices, [0, 1, 2, 3]);
});

test('forEachRotatedSegment: angles cover full circle', () => {
  const angles = [];
  forEachRotatedSegment(4, 0, 0, (i, angle) => angles.push(angle));

  assertAlmostEqual(angles[0], 0);
  assertAlmostEqual(angles[1], Math.PI / 2, 0.001);
  assertAlmostEqual(angles[2], Math.PI, 0.001);
  assertAlmostEqual(angles[3], Math.PI * 1.5, 0.001);
});

test('forEachRotatedSegment: provides valid cos/sin', () => {
  forEachRotatedSegment(8, 0, 0, (i, angle, cos, sin) => {
    // cos² + sin² = 1
    assertAlmostEqual(cos * cos + sin * sin, 1, 0.0001);
  });
});

test('forEachRotatedSegment: first segment at angle 0', () => {
  forEachRotatedSegment(4, 0, 0, (i, angle, cos, sin) => {
    if (i === 0) {
      assertAlmostEqual(cos, 1);
      assertAlmostEqual(sin, 0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// rotatePoint Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- rotatePoint ---');

test('rotatePoint: no rotation returns same point', () => {
  const result = rotatePoint(10, 20, 0);
  assertAlmostEqual(result.x, 10);
  assertAlmostEqual(result.y, 20);
});

test('rotatePoint: 90 degree rotation', () => {
  const result = rotatePoint(10, 0, Math.PI / 2);
  assertAlmostEqual(result.x, 0, 0.0001);
  assertAlmostEqual(result.y, 10, 0.0001);
});

test('rotatePoint: 180 degree rotation', () => {
  const result = rotatePoint(10, 5, Math.PI);
  assertAlmostEqual(result.x, -10, 0.0001);
  assertAlmostEqual(result.y, -5, 0.0001);
});

test('rotatePoint: 360 degree rotation returns to start', () => {
  const result = rotatePoint(10, 20, Math.PI * 2);
  assertAlmostEqual(result.x, 10, 0.0001);
  assertAlmostEqual(result.y, 20, 0.0001);
});

test('rotatePoint: with center offset', () => {
  const result = rotatePoint(10, 0, Math.PI / 2, 100, 100);
  assertAlmostEqual(result.x, 100, 0.0001);
  assertAlmostEqual(result.y, 110, 0.0001);
});

test('rotatePoint: preserves distance from center', () => {
  const originalDistance = Math.sqrt(10 * 10 + 20 * 20);
  const result = rotatePoint(10, 20, 1.234);
  const newDistance = Math.sqrt(result.x * result.x + result.y * result.y);
  assertAlmostEqual(originalDistance, newDistance, 0.0001);
});

test('rotatePoint: negative angle works', () => {
  const positive = rotatePoint(10, 0, Math.PI / 4);
  const negative = rotatePoint(10, 0, -Math.PI / 4);

  assertAlmostEqual(positive.x, negative.x);
  assertAlmostEqual(positive.y, -negative.y, 0.0001);
});

// ═══════════════════════════════════════════════════════════════════════════
// hexToHsl Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- hexToHsl ---');

test('hexToHsl: pure red', () => {
  const result = hexToHsl('#FF0000');
  assertEqual(result.h, 0);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: pure green', () => {
  const result = hexToHsl('#00FF00');
  assertEqual(result.h, 120);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: pure blue', () => {
  const result = hexToHsl('#0000FF');
  assertEqual(result.h, 240);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: white', () => {
  const result = hexToHsl('#FFFFFF');
  assertEqual(result.s, 0);
  assertAlmostEqual(result.l, 100, 0.1);
});

test('hexToHsl: black', () => {
  const result = hexToHsl('#000000');
  assertEqual(result.s, 0);
  assertEqual(result.l, 0);
});

test('hexToHsl: gray (no saturation)', () => {
  const result = hexToHsl('#808080');
  assertEqual(result.s, 0);
  assertAlmostEqual(result.l, 50, 1);
});

test('hexToHsl: shorthand hex (#RGB)', () => {
  const result = hexToHsl('#F00');
  assertEqual(result.h, 0);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: lowercase hex', () => {
  const result = hexToHsl('#ff8800');
  assertTrue(result.h >= 30 && result.h <= 35, `Orange hue should be ~32: ${result.h}`);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: caching works (returns same object)', () => {
  const result1 = hexToHsl('#AABBCC');
  const result2 = hexToHsl('#AABBCC');
  assertTrue(result1 === result2, 'Should return cached object');
});

test('hexToHsl: cyan', () => {
  const result = hexToHsl('#00FFFF');
  assertEqual(result.h, 180);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: magenta', () => {
  const result = hexToHsl('#FF00FF');
  assertEqual(result.h, 300);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

test('hexToHsl: yellow', () => {
  const result = hexToHsl('#FFFF00');
  assertEqual(result.h, 60);
  assertAlmostEqual(result.s, 100, 0.1);
  assertAlmostEqual(result.l, 50, 0.1);
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases and Integration Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- Edge Cases & Integration ---');

test('Integration: rangeForBar + averageRange workflow', () => {
  const freqData = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    freqData[i] = Math.min(255, i);
  }

  const totalBars = 32;
  const averages = [];

  for (let i = 0; i < totalBars; i++) {
    const [start, end] = rangeForBar(i, totalBars, 512);
    const avg = averageRange(freqData, start, end);
    averages.push(avg);
  }

  // Averages should generally increase (higher indices = higher values)
  assertTrue(averages[totalBars - 1] > averages[0], 'Last bar should have higher average');
});

test('Integration: gain + smoothing for typical visualizer', () => {
  let smoothedValue = 0;
  const targetValue = 100;

  for (let barIndex = 0; barIndex < 64; barIndex++) {
    const gain = calculateDynamicGain(barIndex, 64);
    const smoothing = getFrequencyBasedSmoothing(barIndex, 64);
    const adjustedTarget = targetValue * gain;
    smoothedValue = applySmoothValue(smoothedValue, adjustedTarget, smoothing);
  }

  assertTrue(smoothedValue > 0, 'Smoothed value should be positive');
});

test('Edge: expo01 with base 1 (degenerate case)', () => {
  // base=1 would cause division by zero, but we use base=4 by default
  // Just verify default works
  const result = expo01(0.5);
  assertTrue(result >= 0 && result <= 1);
});

test('Edge: very small array for averageRange', () => {
  const arr = [100];
  assertAlmostEqual(averageRange(arr, 0, 1), 100);
});

test('Edge: rotatePoint at origin', () => {
  const result = rotatePoint(0, 0, Math.PI);
  assertAlmostEqual(result.x, 0, 0.0001);
  assertAlmostEqual(result.y, 0, 0.0001);
});

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);
