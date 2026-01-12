/**
 * Quick validation script for audio modules
 * Run with: node test-audio-modules.mjs
 */

import { FrequencyAnalyzer } from './src/lib/audio/FrequencyAnalyzer.js';
import { BeatDetector } from './src/lib/audio/BeatDetector.js';
import { applyEasing, easingNames } from './src/lib/audio/EasingFunctions.js';
import { getAudioLevel, AUDIO_SOURCES } from './src/lib/audio/AudioLevelCalculator.js';
import { calculateEffectValue, EFFECT_NAMES } from './src/lib/audio/AudioReactiveEffects.js';
import { AudioProcessor } from './src/lib/audio/AudioProcessor.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

console.log('\n📦 Testing Audio Modules\n');

// FrequencyAnalyzer Tests
console.log('--- FrequencyAnalyzer ---');
test('FrequencyAnalyzer: creates with default config', () => {
  const analyzer = new FrequencyAnalyzer();
  assert(analyzer.config.fftSize === 2048);
});

test('FrequencyAnalyzer: analyzes FFT data', () => {
  const analyzer = new FrequencyAnalyzer();
  const data = new Uint8Array(1024).fill(128);
  const result = analyzer.analyze(data, 1024);
  assert(result !== null);
  assert(typeof result.bass === 'number');
  assert(typeof result.smoothBass === 'number');
});

test('FrequencyAnalyzer: reset clears state', () => {
  const analyzer = new FrequencyAnalyzer();
  const data = new Uint8Array(1024).fill(200);
  analyzer.analyze(data, 1024);
  analyzer.reset();
  assert(analyzer.smoothBass === 0);
});

// BeatDetector Tests
console.log('\n--- BeatDetector ---');
test('BeatDetector: creates with default config', () => {
  const detector = new BeatDetector();
  assert(detector.config.beatThreshold === 0.45);
});

test('BeatDetector: detects beat on rise', () => {
  const detector = new BeatDetector();
  detector.detect(0, 1000);
  const result = detector.detect(200, 1200);
  assert(result.isBeat === true);
});

test('BeatDetector: respects minimum interval', () => {
  const detector = new BeatDetector();
  detector.detect(0, 1000);
  detector.detect(200, 1100);
  detector.detect(0, 1150);
  const result = detector.detect(200, 1200);
  assert(result.isBeat === false);
});

// EasingFunctions Tests
console.log('\n--- EasingFunctions ---');
test('EasingFunctions: linear returns input', () => {
  assert(applyEasing(0.5, 'linear') === 0.5);
});

test('EasingFunctions: easeOut starts fast', () => {
  assert(applyEasing(0.5, 'easeOut') > 0.5);
});

test('EasingFunctions: all easing names available', () => {
  assert(easingNames.includes('linear'));
  assert(easingNames.includes('bounce'));
  assert(easingNames.includes('elastic'));
});

// AudioLevelCalculator Tests
console.log('\n--- AudioLevelCalculator ---');
test('AudioLevelCalculator: gets bass level', () => {
  const audioData = { bass: 100, smoothBass: 90 };
  assert(getAudioLevel('bass', audioData, false) === 100);
  assert(getAudioLevel('bass', audioData, true) === 90);
});

test('AudioLevelCalculator: AUDIO_SOURCES defined', () => {
  assert(AUDIO_SOURCES.BASS === 'bass');
  assert(AUDIO_SOURCES.DYNAMIC === 'dynamic');
});

// AudioReactiveEffects Tests
console.log('\n--- AudioReactiveEffects ---');
test('AudioReactiveEffects: calculates hue effect', () => {
  const result = calculateEffectValue('hue', 0.5);
  assert(result.hueRotate === 360);
});

test('AudioReactiveEffects: calculates scale effect', () => {
  const result = calculateEffectValue('scale', 0.5);
  assert(result.scale === 1.25);
});

test('AudioReactiveEffects: all 24 effects defined', () => {
  assert(EFFECT_NAMES.length === 24);
});

// AudioProcessor Tests
console.log('\n--- AudioProcessor ---');
test('AudioProcessor: creates and analyzes', () => {
  const processor = new AudioProcessor();
  const data = new Uint8Array(1024).fill(128);
  const result = processor.analyze(data, 1024);
  assert(result !== null);
  assert(typeof result.bass === 'number');
  assert(typeof result.isBeat === 'boolean');
});

test('AudioProcessor: reset clears state', () => {
  const processor = new AudioProcessor();
  const data = new Uint8Array(1024).fill(200);
  processor.analyze(data, 1024);
  processor.reset();
  assert(processor.getLastAnalysis() === null);
});

// Summary
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
