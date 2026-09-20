/**
 * GPU presets: LED-Ziffern 1–5 – eine 5×7-Punktmatrix aus runden LED-Lampen im
 * Stil des LED-Sunstrips (Linsen, Fassung, Bloom, dunkles Gehäuse, Lichtstreuung).
 * Die Lampen der Ziffer leuchten immer (Grundhelligkeit), das Spektrum je Spalte,
 * ein Lauflicht mit den Mitten und Onsets treiben sie an; die übrigen Lampen
 * glimmen wie beim Sunstrip unbeleuchtet mit.
 *
 * Eine Fabrik erzeugt alle fünf Presets aus je einer Bitmap; die Bitmap wird als
 * Konstanten in den Shader gebacken (kein Uniform-Upload pro Frame).
 *
 * @module visualizers/gl/presets/glLedDigits
 */

export const DIGIT_COLS = 5
export const DIGIT_ROWS = 7

/**
 * 5×7-Bitmaps, Zeile 0 = oben, '#' = Lampe an. Klassische Dot-Matrix-Schrift.
 * @type {Record<number, string[]>}
 */
export const DIGIT_BITMAPS = {
  1: ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '#####'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '.###.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
}

/**
 * Zeile als 5-Bit-Zahl, linke Spalte = höchstes Bit.
 * @param {string} row - z. B. '.###.'
 * @returns {number} 0–31
 */
export function rowToBits(row) {
  let bits = 0
  for (let c = 0; c < DIGIT_COLS; c++) bits = bits * 2 + (row[c] === '#' ? 1 : 0)
  return bits
}

/**
 * Fragment-Shader für eine Ziffer. Die Zeilen-Bits stehen als if-Kette im
 * Shader, damit kein Uniform-Array nötig ist.
 * @param {string[]} bitmap
 * @returns {string}
 */
function buildFrag(bitmap) {
  const rows = bitmap.map(rowToBits)
  const rowBits = rows
    .map((bits, i) =>
      i < rows.length - 1 ? `  if (r < ${i}.5) return ${bits}.0;` : `  return ${bits}.0;`,
    )
    .join('\n')

  return /* glsl */ `
uniform float uLensSize;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Bits der Zeile r (0 = oben), linke Spalte = Bit 4.
float rowBits(float r) {
${rowBits}
}

float lampOn(float row, float col) {
  return mod(floor(rowBits(row) / pow(2.0, 4.0 - col)), 2.0);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float vol = uBands.w;

  const float COLS = ${DIGIT_COLS}.0;
  const float ROWS = ${DIGIT_ROWS}.0;
  // Die Ziffer passt in die kuerzere Kante (7 Zeilen hoch, 5 Spalten breit).
  float cell = min(0.86 / ROWS, aspect * 0.86 / COLS);
  vec2 panel = vec2(COLS, ROWS) * cell;

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Gehaeuse wie beim Sunstrip.
  float housing = 1.0 - smoothstep(0.0, 2.0 * aaPx, roundedBox(p, panel * 0.5 + cell * 0.18, cell * 0.25));
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
  rgb += housingCol * housing;
  alpha += housing * 0.92;

  vec2 g = (p + panel * 0.5) / cell;       // 0..COLS, 0..ROWS (y nach oben)
  if (g.x >= 0.0 && g.x < COLS && g.y >= 0.0 && g.y < ROWS) {
    float col = floor(g.x);
    float rowUp = floor(g.y);
    float row = ROWS - 1.0 - rowUp;        // 0 = oben
    vec2 lp = (fract(g) - 0.5) * cell;
    float on = lampOn(row, col);

    // Spektrum je Spalte (wie das Band je Lampe im Sunstrip).
    float sx = (col + 0.5) / COLS * 0.85;
    float e = (spectrum(sx - 0.01) + spectrum(sx) + spectrum(sx + 0.01)) / 3.0 * uIntensity;
    // Lauflicht von unten nach oben, Tempo mit den Mitten.
    float sweep = smoothstep(0.7, 1.0, fract((rowUp + 0.5) / ROWS - t * (0.25 + mid * 0.5)));
    // Grundhelligkeit haelt die Ziffer immer lesbar; Audio legt drauf.
    float lit = on * clamp(0.45 + smoothstep(0.04, 0.5, e) * 0.5 + sweep * 0.35 + uOnset.w * 0.4 + bass * 0.2, 0.0, 1.0);

    float hue = fract(uColorHsl.x + row / ROWS * 0.35);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    vec4 lamp = ledLamp(lp, cell * uLensSize, aaPx, lit, ledCol, ledDim, ledHot, edgeMask);
    rgb += lamp.rgb;
    alpha += lamp.a;
  }

  // Lichtstreuung rund um das Gehaeuse.
  float dist = roundedBox(p, panel * 0.5 + cell * 0.18, cell * 0.25);
  float spill = exp(-max(dist, 0.0) * 12.0) * (0.15 + vol * 0.3) * step(0.0, dist);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.55)) * spill;
  alpha += spill;
  fragColor = outPremul(rgb, alpha);
}
`
}

/**
 * Canvas2D-Fallback (ohne WebGL2): dieselbe Matrix mit einfachen Lampen.
 * @param {string[]} bitmap
 */
function buildFallback(bitmap) {
  return {
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      let sum = 0
      const n = Math.min(bufferLength, dataArray.length)
      for (let i = 0; i < n; i++) sum += dataArray[i]
      const level = n ? (sum / n / 255) * intensity : 0

      const cell = Math.min((h * 0.86) / DIGIT_ROWS, (w * 0.86) / DIGIT_COLS)
      const pw = cell * DIGIT_COLS
      const ph = cell * DIGIT_ROWS
      const x0 = (w - pw) / 2
      const y0 = (h - ph) / 2

      ctx.save()
      ctx.fillStyle = 'rgba(12, 14, 22, 0.92)'
      const pad = cell * 0.18
      ctx.beginPath()
      ctx.roundRect(x0 - pad, y0 - pad, pw + 2 * pad, ph + 2 * pad, cell * 0.25)
      ctx.fill()

      for (let r = 0; r < DIGIT_ROWS; r++) {
        for (let c = 0; c < DIGIT_COLS; c++) {
          const on = bitmap[r][c] === '#'
          const cx = x0 + (c + 0.5) * cell
          const cy = y0 + (r + 0.5) * cell
          const R = cell * 0.38
          const lit = on ? 0.45 + level * 0.55 : 0
          ctx.globalAlpha = on ? 0.35 + lit * 0.65 : 0.25
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(cx, cy, R, 0, Math.PI * 2)
          ctx.fill()
          if (on) {
            ctx.globalAlpha = lit * 0.8
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(cx - R * 0.25, cy - R * 0.25, R * 0.3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.restore()
    },
  }
}

/**
 * Erzeugt das Preset für eine Ziffer.
 * @param {1|2|3|4|5} digit
 */
export function makeLedDigitPreset(digit) {
  const bitmap = DIGIT_BITMAPS[digit]
  if (!bitmap) throw new Error(`Keine Bitmap für Ziffer ${digit}`)
  return {
    id: `glLedDigit${digit}`,
    name_de: `LED-Ziffer ${digit} (GPU)`,
    name_en: `LED Digit ${digit} (GPU)`,
    frag: buildFrag(bitmap),
    uniforms: () => ({ uLensSize: 0.38 }),
    fallback: buildFallback(bitmap),
  }
}

export const glLedDigit1 = makeLedDigitPreset(1)
export const glLedDigit2 = makeLedDigitPreset(2)
export const glLedDigit3 = makeLedDigitPreset(3)
export const glLedDigit4 = makeLedDigitPreset(4)
export const glLedDigit5 = makeLedDigitPreset(5)
