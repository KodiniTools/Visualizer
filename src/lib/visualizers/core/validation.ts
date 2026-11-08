/**
 * Input validation utilities for canvas visualizers
 * Provides robust validation for dataArray and canvas parameters
 * @module visualizers/core/validation
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the input is valid
 * @property {string|null} error - Error message if invalid
 * @property {*} sanitized - Sanitized/default value if applicable
 */

import type { VisualizerContext, VisualizerDrawFn } from './types'

export interface ValidationResult<T> {
  valid: boolean
  error: string | null
  sanitized: T
}

/**
 * Validates that a value is a finite number
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error messages
 * @param {number} [defaultValue] - Default value if invalid
 * @returns {ValidationResult}
 */
export function validateNumber(
  value: unknown,
  name: string,
  defaultValue = 0,
): ValidationResult<number> {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      valid: false,
      error: `${name} must be a finite number, got ${typeof value}`,
      sanitized: defaultValue,
    }
  }
  return { valid: true, error: null, sanitized: value }
}

/**
 * Validates that a value is a positive number
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error messages
 * @param {number} [defaultValue] - Default value if invalid
 * @returns {ValidationResult}
 */
export function validatePositiveNumber(
  value: unknown,
  name: string,
  defaultValue = 1,
): ValidationResult<number> {
  const numResult = validateNumber(value, name, defaultValue)
  if (!numResult.valid) return numResult
  const num = numResult.sanitized // gültig: sanitized === value

  if (num <= 0) {
    return {
      valid: false,
      error: `${name} must be positive, got ${num}`,
      sanitized: defaultValue,
    }
  }
  return { valid: true, error: null, sanitized: num }
}

/**
 * Validates that a value is within a range
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error messages
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {number} [defaultValue] - Default value if invalid
 * @returns {ValidationResult}
 */
export function validateRange(
  value: unknown,
  name: string,
  min: number,
  max: number,
  defaultValue = min,
): ValidationResult<number> {
  const numResult = validateNumber(value, name, defaultValue)
  if (!numResult.valid) return numResult
  const num = numResult.sanitized // gültig: sanitized === value

  if (num < min || num > max) {
    return {
      valid: false,
      error: `${name} must be between ${min} and ${max}, got ${num}`,
      sanitized: Math.max(min, Math.min(max, num)),
    }
  }
  return { valid: true, error: null, sanitized: num }
}

/**
 * Validates audio frequency data array
 * @param {*} dataArray - The data array to validate
 * @param {number} [minLength=1] - Minimum required length
 * @returns {ValidationResult}
 */
export function validateDataArray(
  input: unknown,
  minLength = 1,
): ValidationResult<ArrayLike<number>> {
  const dataArray = input as ArrayLike<number> | null | undefined
  // Check if it's an array-like object
  if (!dataArray || typeof dataArray.length !== 'number') {
    return {
      valid: false,
      error: 'dataArray must be an array-like object',
      sanitized: new Uint8Array(minLength),
    }
  }

  // Check minimum length
  if (dataArray.length < minLength) {
    return {
      valid: false,
      error: `dataArray must have at least ${minLength} elements, got ${dataArray.length}`,
      sanitized: new Uint8Array(minLength),
    }
  }

  // Validate it's a typed array or regular array
  const isTypedArray =
    dataArray instanceof Uint8Array ||
    dataArray instanceof Float32Array ||
    dataArray instanceof Int8Array ||
    dataArray instanceof Uint16Array ||
    dataArray instanceof Int16Array ||
    dataArray instanceof Uint32Array ||
    dataArray instanceof Int32Array ||
    dataArray instanceof Float64Array

  const isRegularArray = Array.isArray(dataArray)

  if (!isTypedArray && !isRegularArray) {
    return {
      valid: false,
      error: 'dataArray must be a TypedArray or Array',
      sanitized: new Uint8Array(dataArray.length || minLength),
    }
  }

  return { valid: true, error: null, sanitized: dataArray }
}

/**
 * Validates buffer length parameter
 * @param {*} bufferLength - The buffer length to validate
 * @param {*} dataArray - The data array for comparison
 * @returns {ValidationResult}
 */
export function validateBufferLength(
  input: unknown,
  dataArray: ArrayLike<number> | null | undefined,
): ValidationResult<number> {
  const numResult = validatePositiveNumber(input, 'bufferLength', 256)
  if (!numResult.valid) return numResult
  const bufferLength = numResult.sanitized // gültig: sanitized === input

  // bufferLength should not exceed dataArray length
  if (dataArray && bufferLength > dataArray.length) {
    return {
      valid: false,
      error: `bufferLength (${bufferLength}) exceeds dataArray length (${dataArray.length})`,
      sanitized: dataArray.length,
    }
  }

  return { valid: true, error: null, sanitized: Math.floor(bufferLength) }
}

/**
 * Validates canvas dimensions
 * @param {*} width - Canvas width
 * @param {*} height - Canvas height
 * @returns {ValidationResult}
 */
export function validateDimensions(
  widthInput: unknown,
  heightInput: unknown,
): ValidationResult<{ width: number; height: number }> {
  const widthResult = validatePositiveNumber(widthInput, 'width', 800)
  const heightResult = validatePositiveNumber(heightInput, 'height', 600)

  if (!widthResult.valid || !heightResult.valid) {
    return {
      valid: false,
      error: widthResult.error || heightResult.error,
      sanitized: { width: widthResult.sanitized, height: heightResult.sanitized },
    }
  }

  // gültig: sanitized === Eingabe
  const width = widthResult.sanitized
  const height = heightResult.sanitized

  // Check for reasonable maximum dimensions (prevent memory issues)
  const maxDimension = 16384 // WebGL max texture size
  if (width > maxDimension || height > maxDimension) {
    return {
      valid: false,
      error: `Dimensions exceed maximum (${maxDimension}): ${width}x${height}`,
      sanitized: {
        width: Math.min(width, maxDimension),
        height: Math.min(height, maxDimension),
      },
    }
  }

  return {
    valid: true,
    error: null,
    sanitized: { width: Math.floor(width), height: Math.floor(height) },
  }
}

/**
 * Validates canvas 2D rendering context
 * @param {*} ctx - The canvas context to validate
 * @returns {ValidationResult}
 */
export function validateCanvasContext(ctx: unknown): ValidationResult<VisualizerContext | null> {
  if (!ctx) {
    return {
      valid: false,
      error: 'Canvas context is null or undefined',
      sanitized: null,
    }
  }

  // Check for essential 2D context methods
  const requiredMethods = ['beginPath', 'fill', 'stroke', 'arc', 'moveTo', 'lineTo']
  for (const method of requiredMethods) {
    if (typeof (ctx as Record<string, unknown>)[method] !== 'function') {
      return {
        valid: false,
        error: `Canvas context missing required method: ${method}`,
        sanitized: null,
      }
    }
  }

  return { valid: true, error: null, sanitized: ctx as VisualizerContext }
}

/**
 * Validates hex color string
 * @param {*} color - The color to validate
 * @param {string} [defaultColor='#ffffff'] - Default color if invalid
 * @returns {ValidationResult}
 */
export function validateHexColor(
  color: unknown,
  defaultColor = '#ffffff',
): ValidationResult<string> {
  if (typeof color !== 'string') {
    return {
      valid: false,
      error: `Color must be a string, got ${typeof color}`,
      sanitized: defaultColor,
    }
  }

  // Match #RGB, #RRGGBB, #RGBA, #RRGGBBAA
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/
  if (!hexPattern.test(color)) {
    return {
      valid: false,
      error: `Invalid hex color format: ${color}`,
      sanitized: defaultColor,
    }
  }

  return { valid: true, error: null, sanitized: color }
}

/**
 * Validates intensity parameter (0-1 range, commonly used)
 * @param {*} intensity - The intensity value
 * @param {number} [defaultValue=1.0] - Default intensity
 * @returns {ValidationResult}
 */
export function validateIntensity(
  intensity: unknown,
  defaultValue = 1.0,
): ValidationResult<number> {
  if (intensity === undefined || intensity === null) {
    return { valid: true, error: null, sanitized: defaultValue }
  }

  return validateRange(intensity, 'intensity', 0, 2, defaultValue)
}

/**
 * Validates all common visualizer draw() parameters at once
 * @param {Object} params - Parameters to validate
 * @param {*} params.ctx - Canvas context
 * @param {*} params.dataArray - Audio data array
 * @param {*} params.bufferLength - Buffer length
 * @param {*} params.width - Canvas width
 * @param {*} params.height - Canvas height
 * @param {*} params.color - Hex color
 * @param {*} params.intensity - Intensity value
 * @returns {Object} Validation results with sanitized values
 */
export function validateDrawParams({
  ctx,
  dataArray,
  bufferLength,
  width,
  height,
  color,
  intensity,
}: Record<
  'ctx' | 'dataArray' | 'bufferLength' | 'width' | 'height' | 'color' | 'intensity',
  unknown
>): DrawParamsValidation {
  const results: DrawParamsValidation = {
    valid: true,
    errors: [],
    params: {},
  }

  // Validate context
  const ctxResult = validateCanvasContext(ctx)
  if (!ctxResult.valid) {
    results.valid = false
    results.errors.push(ctxResult.error)
  }
  results.params.ctx = ctxResult.sanitized

  // Validate data array
  const dataResult = validateDataArray(dataArray)
  if (!dataResult.valid) {
    results.valid = false
    results.errors.push(dataResult.error)
  }
  results.params.dataArray = dataResult.sanitized

  // Validate buffer length
  const bufferResult = validateBufferLength(bufferLength, results.params.dataArray)
  if (!bufferResult.valid) {
    results.errors.push(bufferResult.error) // Warning, not failure
  }
  results.params.bufferLength = bufferResult.sanitized

  // Validate dimensions
  const dimResult = validateDimensions(width, height)
  if (!dimResult.valid) {
    results.errors.push(dimResult.error) // Warning, not failure
  }
  results.params.width = dimResult.sanitized.width
  results.params.height = dimResult.sanitized.height

  // Validate color
  const colorResult = validateHexColor(color)
  if (!colorResult.valid) {
    results.errors.push(colorResult.error) // Warning, not failure
  }
  results.params.color = colorResult.sanitized

  // Validate intensity
  const intensityResult = validateIntensity(intensity)
  if (!intensityResult.valid) {
    results.errors.push(intensityResult.error) // Warning, not failure
  }
  results.params.intensity = intensityResult.sanitized

  return results
}

export interface DrawParamsValidation {
  valid: boolean
  errors: Array<string | null>
  params: {
    ctx?: VisualizerContext | null
    dataArray?: ArrayLike<number>
    bufferLength?: number
    width?: number
    height?: number
    color?: string
    intensity?: number
  }
}

/**
 * Creates a safe wrapper for visualizer draw functions
 * Validates inputs and catches rendering errors
 * @param {Function} drawFn - Original draw function
 * @param {string} visualizerName - Name for error logging
 * @returns {Function} Wrapped draw function
 */
export function createSafeDrawWrapper(
  drawFn: VisualizerDrawFn,
  visualizerName = 'unknown',
): (this: unknown, ...args: Parameters<VisualizerDrawFn>) => void {
  return function safeDrawWrapper(
    this: unknown,
    ctx: VisualizerContext,
    dataArray: Uint8Array,
    bufferLength: number,
    width: number,
    height: number,
    color: string,
    intensity: number = 1.0,
  ) {
    // Quick validation of critical params
    if (!ctx || !dataArray) {
      console.warn(`[${visualizerName}] Missing critical parameters`)
      return
    }

    // Sanitize numeric parameters
    const safeWidth = typeof width === 'number' && width > 0 ? width : 800
    const safeHeight = typeof height === 'number' && height > 0 ? height : 600
    const safeBufferLength =
      typeof bufferLength === 'number' && bufferLength > 0
        ? Math.min(bufferLength, dataArray.length)
        : dataArray.length
    const safeIntensity =
      typeof intensity === 'number' && intensity >= 0 ? Math.min(intensity, 2) : 1.0
    const safeColor = typeof color === 'string' && color.startsWith('#') ? color : '#ffffff'

    try {
      drawFn.call(
        this,
        ctx,
        dataArray,
        safeBufferLength,
        safeWidth,
        safeHeight,
        safeColor,
        safeIntensity,
      )
    } catch (error) {
      console.error(`[${visualizerName}] Rendering error:`, (error as Error).message)
    }
  }
}

/**
 * Validates array index bounds
 * @param {number} index - Index to validate
 * @param {number} length - Array length
 * @param {string} [name='index'] - Parameter name for errors
 * @returns {ValidationResult}
 */
export function validateArrayIndex(
  index: unknown,
  length: number,
  name = 'index',
): ValidationResult<number> {
  const numResult = validateNumber(index, name, 0)
  if (!numResult.valid) return numResult

  const intIndex = Math.floor(numResult.sanitized) // gültig: sanitized === index
  if (intIndex < 0 || intIndex >= length) {
    return {
      valid: false,
      error: `${name} out of bounds: ${intIndex} (length: ${length})`,
      sanitized: Math.max(0, Math.min(length - 1, intIndex)),
    }
  }

  return { valid: true, error: null, sanitized: intIndex }
}

/**
 * Validates and clamps a frequency index for audio data
 * @param {number} freqIndex - Frequency index
 * @param {number} bufferLength - Buffer length
 * @param {number} [maxFreqRatio=0.21] - Maximum frequency ratio to use
 * @returns {number} Clamped frequency index
 */
export function clampFrequencyIndex(
  freqIndex: number,
  bufferLength: number,
  maxFreqRatio = 0.21,
): number {
  const maxIndex = Math.floor(bufferLength * maxFreqRatio)
  return Math.max(0, Math.min(maxIndex, Math.floor(freqIndex)))
}

/**
 * Safely gets a value from audio data array with bounds checking
 * @param {Uint8Array|Array} dataArray - Audio data
 * @param {number} index - Index to access
 * @param {number} [defaultValue=0] - Default if out of bounds
 * @returns {number} Value at index or default
 */
export function safeGetAudioValue(
  dataArray: ArrayLike<number> | null | undefined,
  index: number,
  defaultValue = 0,
): number {
  if (!dataArray || index < 0 || index >= dataArray.length) {
    return defaultValue
  }
  const value = dataArray[Math.floor(index)]
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue
}

/**
 * Validates angle in radians
 * @param {*} angle - Angle to validate
 * @param {number} [defaultValue=0] - Default angle
 * @returns {ValidationResult}
 */
export function validateAngle(angle: unknown, defaultValue = 0): ValidationResult<number> {
  const numResult = validateNumber(angle, 'angle', defaultValue)
  if (!numResult.valid) return numResult

  // Normalize to [0, 2π) range (gültig: sanitized === angle)
  let normalized = numResult.sanitized % (Math.PI * 2)
  if (normalized < 0) normalized += Math.PI * 2

  return { valid: true, error: null, sanitized: normalized }
}
