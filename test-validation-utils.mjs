/**
 * Unit tests for canvas/audio validation utilities
 * Tests validation.js functions
 */

import {
  validateNumber,
  validatePositiveNumber,
  validateRange,
  validateDataArray,
  validateBufferLength,
  validateDimensions,
  validateCanvasContext,
  validateHexColor,
  validateIntensity,
  validateDrawParams,
  createSafeDrawWrapper,
  validateArrayIndex,
  clampFrequencyIndex,
  safeGetAudioValue,
  validateAngle
} from './src/lib/visualizers/core/validation.js';

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

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected false');
  }
}

console.log('📦 Testing Validation Utility Functions\n');

// ═══════════════════════════════════════════════════════════════════════════
// validateNumber Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('--- validateNumber ---');

test('validateNumber: valid number returns valid', () => {
  const result = validateNumber(42, 'test');
  assertTrue(result.valid);
  assertEqual(result.error, null);
  assertEqual(result.sanitized, 42);
});

test('validateNumber: string returns invalid', () => {
  const result = validateNumber('42', 'test');
  assertFalse(result.valid);
  assertTrue(result.error.includes('must be a finite number'));
  assertEqual(result.sanitized, 0);
});

test('validateNumber: NaN returns invalid', () => {
  const result = validateNumber(NaN, 'test');
  assertFalse(result.valid);
  assertEqual(result.sanitized, 0);
});

test('validateNumber: Infinity returns invalid', () => {
  const result = validateNumber(Infinity, 'test');
  assertFalse(result.valid);
  assertEqual(result.sanitized, 0);
});

test('validateNumber: null returns invalid', () => {
  const result = validateNumber(null, 'test', 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 10);
});

test('validateNumber: custom default value', () => {
  const result = validateNumber(undefined, 'test', 99);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 99);
});

test('validateNumber: negative numbers valid', () => {
  const result = validateNumber(-50, 'test');
  assertTrue(result.valid);
  assertEqual(result.sanitized, -50);
});

test('validateNumber: zero is valid', () => {
  const result = validateNumber(0, 'test');
  assertTrue(result.valid);
  assertEqual(result.sanitized, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// validatePositiveNumber Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validatePositiveNumber ---');

test('validatePositiveNumber: positive number valid', () => {
  const result = validatePositiveNumber(10, 'test');
  assertTrue(result.valid);
  assertEqual(result.sanitized, 10);
});

test('validatePositiveNumber: zero invalid', () => {
  const result = validatePositiveNumber(0, 'test');
  assertFalse(result.valid);
  assertTrue(result.error.includes('must be positive'));
});

test('validatePositiveNumber: negative invalid', () => {
  const result = validatePositiveNumber(-5, 'test');
  assertFalse(result.valid);
  assertEqual(result.sanitized, 1);
});

test('validatePositiveNumber: custom default', () => {
  const result = validatePositiveNumber(-5, 'test', 50);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 50);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateRange Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateRange ---');

test('validateRange: value in range valid', () => {
  const result = validateRange(5, 'test', 0, 10);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 5);
});

test('validateRange: value at min valid', () => {
  const result = validateRange(0, 'test', 0, 10);
  assertTrue(result.valid);
});

test('validateRange: value at max valid', () => {
  const result = validateRange(10, 'test', 0, 10);
  assertTrue(result.valid);
});

test('validateRange: value below min invalid', () => {
  const result = validateRange(-5, 'test', 0, 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 0);
});

test('validateRange: value above max invalid', () => {
  const result = validateRange(15, 'test', 0, 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 10);
});

test('validateRange: non-number invalid', () => {
  const result = validateRange('5', 'test', 0, 10);
  assertFalse(result.valid);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateDataArray Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateDataArray ---');

test('validateDataArray: Uint8Array valid', () => {
  const arr = new Uint8Array(256);
  const result = validateDataArray(arr);
  assertTrue(result.valid);
  assertEqual(result.sanitized, arr);
});

test('validateDataArray: Float32Array valid', () => {
  const arr = new Float32Array(512);
  const result = validateDataArray(arr);
  assertTrue(result.valid);
});

test('validateDataArray: regular Array valid', () => {
  const arr = [1, 2, 3, 4, 5];
  const result = validateDataArray(arr);
  assertTrue(result.valid);
});

test('validateDataArray: null invalid', () => {
  const result = validateDataArray(null);
  assertFalse(result.valid);
  assertTrue(result.error.includes('array-like object'));
});

test('validateDataArray: undefined invalid', () => {
  const result = validateDataArray(undefined);
  assertFalse(result.valid);
});

test('validateDataArray: empty array respects minLength', () => {
  const arr = [];
  const result = validateDataArray(arr, 10);
  assertFalse(result.valid);
  assertTrue(result.error.includes('at least 10 elements'));
});

test('validateDataArray: object without length invalid', () => {
  const result = validateDataArray({});
  assertFalse(result.valid);
});

test('validateDataArray: string invalid (not array type)', () => {
  const result = validateDataArray('test');
  assertFalse(result.valid);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateBufferLength Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateBufferLength ---');

test('validateBufferLength: valid length', () => {
  const arr = new Uint8Array(256);
  const result = validateBufferLength(128, arr);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 128);
});

test('validateBufferLength: exceeds array length', () => {
  const arr = new Uint8Array(100);
  const result = validateBufferLength(200, arr);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 100);
});

test('validateBufferLength: non-number invalid', () => {
  const result = validateBufferLength('128', [1, 2, 3]);
  assertFalse(result.valid);
});

test('validateBufferLength: zero invalid', () => {
  const result = validateBufferLength(0, [1, 2, 3]);
  assertFalse(result.valid);
});

test('validateBufferLength: negative invalid', () => {
  const result = validateBufferLength(-10, [1, 2, 3]);
  assertFalse(result.valid);
});

test('validateBufferLength: floors decimal values', () => {
  const arr = new Uint8Array(100);
  const result = validateBufferLength(50.9, arr);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 50);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateDimensions Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateDimensions ---');

test('validateDimensions: valid dimensions', () => {
  const result = validateDimensions(800, 600);
  assertTrue(result.valid);
  assertEqual(result.sanitized.width, 800);
  assertEqual(result.sanitized.height, 600);
});

test('validateDimensions: zero width invalid', () => {
  const result = validateDimensions(0, 600);
  assertFalse(result.valid);
});

test('validateDimensions: zero height invalid', () => {
  const result = validateDimensions(800, 0);
  assertFalse(result.valid);
});

test('validateDimensions: negative invalid', () => {
  const result = validateDimensions(-100, 600);
  assertFalse(result.valid);
});

test('validateDimensions: exceeds max clamps value', () => {
  const result = validateDimensions(20000, 600);
  assertFalse(result.valid);
  assertEqual(result.sanitized.width, 16384);
});

test('validateDimensions: floors decimal values', () => {
  const result = validateDimensions(800.7, 600.3);
  assertTrue(result.valid);
  assertEqual(result.sanitized.width, 800);
  assertEqual(result.sanitized.height, 600);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateCanvasContext Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateCanvasContext ---');

test('validateCanvasContext: null invalid', () => {
  const result = validateCanvasContext(null);
  assertFalse(result.valid);
  assertTrue(result.error.includes('null or undefined'));
});

test('validateCanvasContext: undefined invalid', () => {
  const result = validateCanvasContext(undefined);
  assertFalse(result.valid);
});

test('validateCanvasContext: missing methods invalid', () => {
  const fakeCtx = { beginPath: () => {} };
  const result = validateCanvasContext(fakeCtx);
  assertFalse(result.valid);
  assertTrue(result.error.includes('missing required method'));
});

test('validateCanvasContext: mock context with all methods valid', () => {
  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };
  const result = validateCanvasContext(mockCtx);
  assertTrue(result.valid);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateHexColor Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateHexColor ---');

test('validateHexColor: #RGB valid', () => {
  const result = validateHexColor('#F00');
  assertTrue(result.valid);
  assertEqual(result.sanitized, '#F00');
});

test('validateHexColor: #RRGGBB valid', () => {
  const result = validateHexColor('#FF0000');
  assertTrue(result.valid);
});

test('validateHexColor: #RRGGBBAA valid', () => {
  const result = validateHexColor('#FF0000FF');
  assertTrue(result.valid);
});

test('validateHexColor: lowercase valid', () => {
  const result = validateHexColor('#aabbcc');
  assertTrue(result.valid);
});

test('validateHexColor: missing # invalid', () => {
  const result = validateHexColor('FF0000');
  assertFalse(result.valid);
  assertEqual(result.sanitized, '#ffffff');
});

test('validateHexColor: invalid characters', () => {
  const result = validateHexColor('#GGHHII');
  assertFalse(result.valid);
});

test('validateHexColor: #RGBA (4 chars) valid', () => {
  const result = validateHexColor('#FF00');
  assertTrue(result.valid);
});

test('validateHexColor: wrong length (5 chars) invalid', () => {
  const result = validateHexColor('#FF000');
  assertFalse(result.valid);
});

test('validateHexColor: non-string invalid', () => {
  const result = validateHexColor(255);
  assertFalse(result.valid);
});

test('validateHexColor: custom default', () => {
  const result = validateHexColor('invalid', '#000000');
  assertFalse(result.valid);
  assertEqual(result.sanitized, '#000000');
});

// ═══════════════════════════════════════════════════════════════════════════
// validateIntensity Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateIntensity ---');

test('validateIntensity: valid intensity', () => {
  const result = validateIntensity(0.5);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 0.5);
});

test('validateIntensity: zero valid', () => {
  const result = validateIntensity(0);
  assertTrue(result.valid);
});

test('validateIntensity: max 2.0 valid', () => {
  const result = validateIntensity(2.0);
  assertTrue(result.valid);
});

test('validateIntensity: undefined uses default', () => {
  const result = validateIntensity(undefined);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 1.0);
});

test('validateIntensity: null uses default', () => {
  const result = validateIntensity(null, 0.8);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 0.8);
});

test('validateIntensity: negative clamps to 0', () => {
  const result = validateIntensity(-0.5);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 0);
});

test('validateIntensity: above max clamps', () => {
  const result = validateIntensity(3.0);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 2);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateArrayIndex Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateArrayIndex ---');

test('validateArrayIndex: valid index', () => {
  const result = validateArrayIndex(5, 10);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 5);
});

test('validateArrayIndex: index 0 valid', () => {
  const result = validateArrayIndex(0, 10);
  assertTrue(result.valid);
});

test('validateArrayIndex: last index valid', () => {
  const result = validateArrayIndex(9, 10);
  assertTrue(result.valid);
});

test('validateArrayIndex: negative invalid', () => {
  const result = validateArrayIndex(-1, 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 0);
});

test('validateArrayIndex: equal to length invalid', () => {
  const result = validateArrayIndex(10, 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 9);
});

test('validateArrayIndex: above length invalid', () => {
  const result = validateArrayIndex(15, 10);
  assertFalse(result.valid);
  assertEqual(result.sanitized, 9);
});

test('validateArrayIndex: floors decimal', () => {
  const result = validateArrayIndex(5.7, 10);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 5);
});

// ═══════════════════════════════════════════════════════════════════════════
// clampFrequencyIndex Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- clampFrequencyIndex ---');

test('clampFrequencyIndex: within range unchanged', () => {
  const result = clampFrequencyIndex(50, 1024);
  assertEqual(result, 50);
});

test('clampFrequencyIndex: negative clamped to 0', () => {
  const result = clampFrequencyIndex(-10, 1024);
  assertEqual(result, 0);
});

test('clampFrequencyIndex: above max clamped', () => {
  const maxIndex = Math.floor(1024 * 0.21);
  const result = clampFrequencyIndex(500, 1024);
  assertEqual(result, maxIndex);
});

test('clampFrequencyIndex: custom ratio', () => {
  const maxIndex = Math.floor(1024 * 0.5);
  const result = clampFrequencyIndex(1000, 1024, 0.5);
  assertEqual(result, maxIndex);
});

test('clampFrequencyIndex: floors decimal', () => {
  const result = clampFrequencyIndex(50.9, 1024);
  assertEqual(result, 50);
});

// ═══════════════════════════════════════════════════════════════════════════
// safeGetAudioValue Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- safeGetAudioValue ---');

test('safeGetAudioValue: valid index returns value', () => {
  const arr = new Uint8Array([100, 150, 200]);
  assertEqual(safeGetAudioValue(arr, 1), 150);
});

test('safeGetAudioValue: negative index returns default', () => {
  const arr = new Uint8Array([100, 150, 200]);
  assertEqual(safeGetAudioValue(arr, -1), 0);
});

test('safeGetAudioValue: index above length returns default', () => {
  const arr = new Uint8Array([100, 150, 200]);
  assertEqual(safeGetAudioValue(arr, 5), 0);
});

test('safeGetAudioValue: null array returns default', () => {
  assertEqual(safeGetAudioValue(null, 0), 0);
});

test('safeGetAudioValue: custom default', () => {
  assertEqual(safeGetAudioValue(null, 0, 128), 128);
});

test('safeGetAudioValue: floors decimal index', () => {
  const arr = new Uint8Array([100, 150, 200]);
  assertEqual(safeGetAudioValue(arr, 1.9), 150);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateAngle Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateAngle ---');

test('validateAngle: valid angle', () => {
  const result = validateAngle(Math.PI);
  assertTrue(result.valid);
  assertAlmostEqual(result.sanitized, Math.PI);
});

test('validateAngle: zero valid', () => {
  const result = validateAngle(0);
  assertTrue(result.valid);
});

test('validateAngle: normalizes > 2π', () => {
  const result = validateAngle(Math.PI * 3);
  assertTrue(result.valid);
  assertAlmostEqual(result.sanitized, Math.PI);
});

test('validateAngle: normalizes negative', () => {
  const result = validateAngle(-Math.PI / 2);
  assertTrue(result.valid);
  assertAlmostEqual(result.sanitized, Math.PI * 1.5);
});

test('validateAngle: non-number invalid', () => {
  const result = validateAngle('90deg');
  assertFalse(result.valid);
});

// ═══════════════════════════════════════════════════════════════════════════
// validateDrawParams Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- validateDrawParams ---');

test('validateDrawParams: all valid params', () => {
  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };
  const result = validateDrawParams({
    ctx: mockCtx,
    dataArray: new Uint8Array(256),
    bufferLength: 256,
    width: 800,
    height: 600,
    color: '#FF0000',
    intensity: 1.0
  });
  assertTrue(result.valid);
  assertEqual(result.errors.length, 0);
});

test('validateDrawParams: null ctx fails', () => {
  const result = validateDrawParams({
    ctx: null,
    dataArray: new Uint8Array(256),
    bufferLength: 256,
    width: 800,
    height: 600,
    color: '#FF0000',
    intensity: 1.0
  });
  assertFalse(result.valid);
  assertTrue(result.errors.length > 0);
});

test('validateDrawParams: null dataArray fails', () => {
  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };
  const result = validateDrawParams({
    ctx: mockCtx,
    dataArray: null,
    bufferLength: 256,
    width: 800,
    height: 600,
    color: '#FF0000',
    intensity: 1.0
  });
  assertFalse(result.valid);
});

test('validateDrawParams: sanitizes invalid color', () => {
  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };
  const result = validateDrawParams({
    ctx: mockCtx,
    dataArray: new Uint8Array(256),
    bufferLength: 256,
    width: 800,
    height: 600,
    color: 'invalid',
    intensity: 1.0
  });
  assertEqual(result.params.color, '#ffffff');
});

// ═══════════════════════════════════════════════════════════════════════════
// createSafeDrawWrapper Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- createSafeDrawWrapper ---');

test('createSafeDrawWrapper: calls original function', () => {
  let called = false;
  const original = () => { called = true; };
  const wrapped = createSafeDrawWrapper(original, 'test');

  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };

  wrapped(mockCtx, new Uint8Array(256), 256, 800, 600, '#FF0000', 1.0);
  assertTrue(called);
});

test('createSafeDrawWrapper: handles null ctx gracefully', () => {
  const original = () => { throw new Error('Should not be called'); };
  const wrapped = createSafeDrawWrapper(original, 'test');

  // Should not throw
  wrapped(null, new Uint8Array(256), 256, 800, 600, '#FF0000', 1.0);
});

test('createSafeDrawWrapper: handles null dataArray gracefully', () => {
  const original = () => { throw new Error('Should not be called'); };
  const wrapped = createSafeDrawWrapper(original, 'test');

  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };

  // Should not throw
  wrapped(mockCtx, null, 256, 800, 600, '#FF0000', 1.0);
});

test('createSafeDrawWrapper: catches and logs errors', () => {
  const original = () => { throw new Error('Test error'); };
  const wrapped = createSafeDrawWrapper(original, 'test');

  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };

  // Should not throw (error is caught)
  wrapped(mockCtx, new Uint8Array(256), 256, 800, 600, '#FF0000', 1.0);
});

test('createSafeDrawWrapper: sanitizes invalid dimensions', () => {
  let receivedWidth, receivedHeight;
  const original = (ctx, data, buf, w, h) => {
    receivedWidth = w;
    receivedHeight = h;
  };
  const wrapped = createSafeDrawWrapper(original, 'test');

  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };

  wrapped(mockCtx, new Uint8Array(256), 256, -100, 0, '#FF0000', 1.0);
  assertEqual(receivedWidth, 800);
  assertEqual(receivedHeight, 600);
});

test('createSafeDrawWrapper: clamps intensity', () => {
  let receivedIntensity;
  const original = (ctx, data, buf, w, h, color, intensity) => {
    receivedIntensity = intensity;
  };
  const wrapped = createSafeDrawWrapper(original, 'test');

  const mockCtx = {
    beginPath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    moveTo: () => {},
    lineTo: () => {}
  };

  wrapped(mockCtx, new Uint8Array(256), 256, 800, 600, '#FF0000', 5.0);
  assertEqual(receivedIntensity, 2);
});

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- Edge Cases ---');

test('Edge: empty Uint8Array valid with minLength 0', () => {
  const result = validateDataArray(new Uint8Array(0), 0);
  assertTrue(result.valid);
});

test('Edge: very small dimensions valid', () => {
  const result = validateDimensions(1, 1);
  assertTrue(result.valid);
});

test('Edge: intensity exactly 0 valid', () => {
  const result = validateIntensity(0);
  assertTrue(result.valid);
  assertEqual(result.sanitized, 0);
});

test('Edge: angle exactly 2π normalizes to 0', () => {
  const result = validateAngle(Math.PI * 2);
  assertTrue(result.valid);
  assertAlmostEqual(result.sanitized, 0, 0.0001);
});

test('Edge: bufferLength equals array length', () => {
  const arr = new Uint8Array(100);
  const result = validateBufferLength(100, arr);
  assertTrue(result.valid);
});

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);
