/**
 * Image Filter Web Worker
 * Verarbeitet Bildfilter (Brightness, Contrast, Saturation, etc.) im Hintergrund
 */

/**
 * Wendet Filter auf ImageData an
 * @param {ImageData} imageData - Die zu verarbeitenden Bilddaten
 * @param {object} filters - Filter-Einstellungen
 * @returns {ImageData} Verarbeitete Bilddaten
 */
function applyFilters(imageData, filters) {
  const data = imageData.data;
  const length = data.length;

  const brightness = (filters.brightness || 100) / 100;
  const contrast = (filters.contrast || 100) / 100;
  const saturation = (filters.saturation || 100) / 100;
  const hueRotate = filters.hueRotate || 0;
  const invert = filters.invert || 0;
  const sepia = filters.sepia || 0;

  // Contrast-Faktor berechnen
  const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    // Alpha bleibt unverändert: data[i + 3]

    // 1. Brightness
    r *= brightness;
    g *= brightness;
    b *= brightness;

    // 2. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 3. Saturation
    if (saturation !== 1) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + saturation * (r - gray);
      g = gray + saturation * (g - gray);
      b = gray + saturation * (b - gray);
    }

    // 4. Hue Rotation (vereinfacht)
    if (hueRotate !== 0) {
      const angle = hueRotate * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const newR = r * (0.213 + cos * 0.787 - sin * 0.213) +
                   g * (0.715 - cos * 0.715 - sin * 0.715) +
                   b * (0.072 - cos * 0.072 + sin * 0.928);
      const newG = r * (0.213 - cos * 0.213 + sin * 0.143) +
                   g * (0.715 + cos * 0.285 + sin * 0.140) +
                   b * (0.072 - cos * 0.072 - sin * 0.283);
      const newB = r * (0.213 - cos * 0.213 - sin * 0.787) +
                   g * (0.715 - cos * 0.715 + sin * 0.715) +
                   b * (0.072 + cos * 0.928 + sin * 0.072);

      r = newR;
      g = newG;
      b = newB;
    }

    // 5. Invert
    if (invert > 0) {
      r = r + invert * (255 - 2 * r);
      g = g + invert * (255 - 2 * g);
      b = b + invert * (255 - 2 * b);
    }

    // 6. Sepia
    if (sepia > 0) {
      const sepiaR = 0.393 * r + 0.769 * g + 0.189 * b;
      const sepiaG = 0.349 * r + 0.686 * g + 0.168 * b;
      const sepiaB = 0.272 * r + 0.534 * g + 0.131 * b;

      r = r + sepia * (sepiaR - r);
      g = g + sepia * (sepiaG - g);
      b = b + sepia * (sepiaB - b);
    }

    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return imageData;
}

/**
 * Wendet Blur auf ImageData an (Box Blur)
 * @param {ImageData} imageData - Die zu verarbeitenden Bilddaten
 * @param {number} radius - Blur-Radius
 * @returns {ImageData} Verarbeitete Bilddaten
 */
function applyBlur(imageData, radius) {
  if (radius <= 0) return imageData;

  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  const size = radius * 2 + 1;
  const area = size * size;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;

          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = r / area;
      output[idx + 1] = g / area;
      output[idx + 2] = b / area;
      output[idx + 3] = a / area;
    }
  }

  imageData.data.set(output);
  return imageData;
}

// Message Handler
self.onmessage = function(e) {
  const { type, imageData, filters, blur, jobId } = e.data;

  switch (type) {
    case 'applyFilters':
      try {
        let result = imageData;

        // Filter anwenden
        if (filters) {
          result = applyFilters(result, filters);
        }

        // Blur anwenden (falls gewünscht)
        if (blur && blur > 0) {
          result = applyBlur(result, Math.floor(blur));
        }

        self.postMessage({
          type: 'filterResult',
          imageData: result,
          jobId
        }, [result.data.buffer]); // Transfer für Performance

      } catch (error) {
        self.postMessage({
          type: 'error',
          error: error.message,
          jobId
        });
      }
      break;

    default:
      console.warn('[ImageFilterWorker] Unknown message type:', type);
  }
};

// Worker ist bereit
self.postMessage({ type: 'ready' });
