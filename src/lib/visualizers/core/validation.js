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

/**
 * Validates that a value is a finite number
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error messages
 * @param {number} [defaultValue] - Default value if invalid
 * @returns {ValidationResult}
 */
export function validateNumber(value, name, defaultValue = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      valid: false,
      error: `${name} must be a finite number, got ${typeof value}`,
      sanitized: defaultValue
    };
  }
  return { valid: true, error: null, sanitized: value };
}

/**
 * Validates that a value is a positive number
 * @param {*} value - Value to check
 * @param {string} name - Parameter name for error messages
 * @param {number} [defaultValue] - Default value if invalid
 * @returns {ValidationResult}
 */
export function validatePositiveNumber(value, name, defaultValue = 1) {
  const numResult = validateNumber(value, name, defaultValue);
  if (!numResult.valid) return numResult;

  if (value <= 0) {
    return {
      valid: false,
      error: `${name} must be positive, got ${value}`,
      sanitized: defaultValue
    };
  }
  return { valid: true, error: null, sanitized: value };
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
export function validateRange(value, name, min, max, defaultValue = min) {
  const numResult = validateNumber(value, name, defaultValue);
  if (!numResult.valid) return numResult;

  if (value < min || value > max) {
    return {
      valid: false,
      error: `${name} must be between ${min} and ${max}, got ${value}`,
      sanitized: Math.max(min, Math.min(max, value))
    };
  }
  return { valid: true, error: null, sanitized: value };
}

/**
 * Validates audio frequency data array
 * @param {*} dataArray - The data array to validate
 * @param {number} [minLength=1] - Minimum required length
 * @returns {ValidationResult}
 */
export function validateDataArray(dataArray, minLength = 1) {
  // Check if it's an array-like object
  if (!dataArray || typeof dataArray.length !== 'number') {
    return {
      valid: false,
      error: 'dataArray must be an array-like object',
      sanitized: new Uint8Array(minLength)
    };
  }

  // Check minimum length
  if (dataArray.length < minLength) {
    return {
      valid: false,
      error: `dataArray must have at least ${minLength} elements, got ${dataArray.length}`,
      sanitized: new Uint8Array(minLength)
    };
  }

  // Validate it's a typed array or regular array
  const isTypedArray = dataArray instanceof Uint8Array ||
                       dataArray instanceof Float32Array ||
                       dataArray instanceof Int8Array ||
                       dataArray instanceof Uint16Array ||
                       dataArray instanceof Int16Array ||
                       dataArray instanceof Uint32Array ||
                       dataArray instanceof Int32Array ||
                       dataArray instanceof Float64Array;

  const isRegularArray = Array.isArray(dataArray);

  if (!isTypedArray && !isRegularArray) {
    return {
      valid: false,
      error: 'dataArray must be a TypedArray or Array',
      sanitized: new Uint8Array(dataArray.length || minLength)
    };
  }

  return { valid: true, error: null, sanitized: dataArray };
}

/**
 * Validates buffer length parameter
 * @param {*} bufferLength - The buffer length to validate
 * @param {*} dataArray - The data array for comparison
 * @returns {ValidationResult}
 */
export function validateBufferLength(bufferLength, dataArray) {
  const numResult = validatePositiveNumber(bufferLength, 'bufferLength', 256);
  if (!numResult.valid) return numResult;

  // bufferLength should not exceed dataArray length
  if (dataArray && bufferLength > dataArray.length) {
    return {
      valid: false,
      error: `bufferLength (${bufferLength}) exceeds dataArray length (${dataArray.length})`,
      sanitized: dataArray.length
    };
  }

  return { valid: true, error: null, sanitized: Math.floor(bufferLength) };
}

/**
 * Validates canvas dimensions
 * @param {*} width - Canvas width
 * @param {*} height - Canvas height
 * @returns {ValidationResult}
 */
export function validateDimensions(width, height) {
  const widthResult = validatePositiveNumber(width, 'width', 800);
  const heightResult = validatePositiveNumber(height, 'height', 600);

  if (!widthResult.valid || !heightResult.valid) {
    return {
      valid: false,
      error: widthResult.error || heightResult.error,
      sanitized: { width: widthResult.sanitized, height: heightResult.sanitized }
    };
  }

  // Check for reasonable maximum dimensions (prevent memory issues)
  const maxDimension = 16384; // WebGL max texture size
  if (width > maxDimension || height > maxDimension) {
    return {
      valid: false,
      error: `Dimensions exceed maximum (${maxDimension}): ${width}x${height}`,
      sanitized: {
        width: Math.min(width, maxDimension),
        height: Math.min(height, maxDimension)
      }
    };
  }

  return {
    valid: true,
    error: null,
    sanitized: { width: Math.floor(width), height: Math.floor(height) }
  };
}

/**
 * Validates canvas 2D rendering context
 * @param {*} ctx - The canvas context to validate
 * @returns {ValidationResult}
 */
export function validateCanvasContext(ctx) {
  if (!ctx) {
    return {
      valid: false,
      error: 'Canvas context is null or undefined',
      sanitized: null
    };
  }

  // Check for essential 2D context methods
  const requiredMethods = ['beginPath', 'fill', 'stroke', 'arc', 'moveTo', 'lineTo'];
  for (const method of requiredMethods) {
    if (typeof ctx[method] !== 'function') {
      return {
        valid: false,
        error: `Canvas context missing required method: ${method}`,
        sanitized: null
      };
    }
  }

  return { valid: true, error: null, sanitized: ctx };
}

/**
 * Validates hex color string
 * @param {*} color - The color to validate
 * @param {string} [defaultColor='#ffffff'] - Default color if invalid
 * @returns {ValidationResult}
 */
export function validateHexColor(color, defaultColor = '#ffffff') {
  if (typeof color !== 'string') {
    return {
      valid: false,
      error: `Color must be a string, got ${typeof color}`,
      sanitized: defaultColor
    };
  }

  // Match #RGB, #RRGGBB, #RGBA, #RRGGBBAA
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  if (!hexPattern.test(color)) {
    return {
      valid: false,
      error: `Invalid hex color format: ${color}`,
      sanitized: defaultColor
    };
  }

  return { valid: true, error: null, sanitized: color };
}

/**
 * Validates intensity parameter (0-1 range, commonly used)
 * @param {*} intensity - The intensity value
 * @param {number} [defaultValue=1.0] - Default intensity
 * @returns {ValidationResult}
 */
export function validateIntensity(intensity, defaultValue = 1.0) {
  if (intensity === undefined || intensity === null) {
    return { valid: true, error: null, sanitized: defaultValue };
  }

  return validateRange(intensity, 'intensity', 0, 2, defaultValue);
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
export function validateDrawParams({ ctx, dataArray, bufferLength, width, height, color, intensity }) {
  const results = {
    valid: true,
    errors: [],
    params: {}
  };

  // Validate context
  const ctxResult = validateCanvasContext(ctx);
  if (!ctxResult.valid) {
    results.valid = false;
    results.errors.push(ctxResult.error);
  }
  results.params.ctx = ctxResult.sanitized;

  // Validate data array
  const dataResult = validateDataArray(dataArray);
  if (!dataResult.valid) {
    results.valid = false;
    results.errors.push(dataResult.error);
  }
  results.params.dataArray = dataResult.sanitized;

  // Validate buffer length
  const bufferResult = validateBufferLength(bufferLength, results.params.dataArray);
  if (!bufferResult.valid) {
    results.errors.push(bufferResult.error); // Warning, not failure
  }
  results.params.bufferLength = bufferResult.sanitized;

  // Validate dimensions
  const dimResult = validateDimensions(width, height);
  if (!dimResult.valid) {
    results.errors.push(dimResult.error); // Warning, not failure
  }
  results.params.width = dimResult.sanitized.width;
  results.params.height = dimResult.sanitized.height;

  // Validate color
  const colorResult = validateHexColor(color);
  if (!colorResult.valid) {
    results.errors.push(colorResult.error); // Warning, not failure
  }
  results.params.color = colorResult.sanitized;

  // Validate intensity
  const intensityResult = validateIntensity(intensity);
  if (!intensityResult.valid) {
    results.errors.push(intensityResult.error); // Warning, not failure
  }
  results.params.intensity = intensityResult.sanitized;

  return results;
}

/**
 * Creates a safe wrapper for visualizer draw functions
 * Validates inputs and catches rendering errors
 * @param {Function} drawFn - Original draw function
 * @param {string} visualizerName - Name for error logging
 * @returns {Function} Wrapped draw function
 */
export function createSafeDrawWrapper(drawFn, visualizerName = 'unknown') {
  return function safeDrawWrapper(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    // Quick validation of critical params
    if (!ctx || !dataArray) {
      console.warn(`[${visualizerName}] Missing critical parameters`);
      return;
    }

    // Sanitize numeric parameters
    const safeWidth = (typeof width === 'number' && width > 0) ? width : 800;
    const safeHeight = (typeof height === 'number' && height > 0) ? height : 600;
    const safeBufferLength = (typeof bufferLength === 'number' && bufferLength > 0)
      ? Math.min(bufferLength, dataArray.length)
      : dataArray.length;
    const safeIntensity = (typeof intensity === 'number' && intensity >= 0)
      ? Math.min(intensity, 2)
      : 1.0;
    const safeColor = (typeof color === 'string' && color.startsWith('#'))
      ? color
      : '#ffffff';

    try {
      drawFn.call(this, ctx, dataArray, safeBufferLength, safeWidth, safeHeight, safeColor, safeIntensity);
    } catch (error) {
      console.error(`[${visualizerName}] Rendering error:`, error.message);
    }
  };
}

/**
 * Validates array index bounds
 * @param {number} index - Index to validate
 * @param {number} length - Array length
 * @param {string} [name='index'] - Parameter name for errors
 * @returns {ValidationResult}
 */
export function validateArrayIndex(index, length, name = 'index') {
  const numResult = validateNumber(index, name, 0);
  if (!numResult.valid) return numResult;

  const intIndex = Math.floor(index);
  if (intIndex < 0 || intIndex >= length) {
    return {
      valid: false,
      error: `${name} out of bounds: ${intIndex} (length: ${length})`,
      sanitized: Math.max(0, Math.min(length - 1, intIndex))
    };
  }

  return { valid: true, error: null, sanitized: intIndex };
}

/**
 * Validates and clamps a frequency index for audio data
 * @param {number} freqIndex - Frequency index
 * @param {number} bufferLength - Buffer length
 * @param {number} [maxFreqRatio=0.21] - Maximum frequency ratio to use
 * @returns {number} Clamped frequency index
 */
export function clampFrequencyIndex(freqIndex, bufferLength, maxFreqRatio = 0.21) {
  const maxIndex = Math.floor(bufferLength * maxFreqRatio);
  return Math.max(0, Math.min(maxIndex, Math.floor(freqIndex)));
}

/**
 * Safely gets a value from audio data array with bounds checking
 * @param {Uint8Array|Array} dataArray - Audio data
 * @param {number} index - Index to access
 * @param {number} [defaultValue=0] - Default if out of bounds
 * @returns {number} Value at index or default
 */
export function safeGetAudioValue(dataArray, index, defaultValue = 0) {
  if (!dataArray || index < 0 || index >= dataArray.length) {
    return defaultValue;
  }
  const value = dataArray[Math.floor(index)];
  return (typeof value === 'number' && Number.isFinite(value)) ? value : defaultValue;
}

/**
 * Validates angle in radians
 * @param {*} angle - Angle to validate
 * @param {number} [defaultValue=0] - Default angle
 * @returns {ValidationResult}
 */
export function validateAngle(angle, defaultValue = 0) {
  const numResult = validateNumber(angle, 'angle', defaultValue);
  if (!numResult.valid) return numResult;

  // Normalize to [0, 2π) range
  let normalized = angle % (Math.PI * 2);
  if (normalized < 0) normalized += Math.PI * 2;

  return { valid: true, error: null, sanitized: normalized };
}
