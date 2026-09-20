/**
 * GPU presets: LED-Ziffern 0–9 – eine 5×7-Punktmatrix aus runden LED-Lampen im
 * Stil des LED-Sunstrips (Linsen, Fassung, Bloom, dunkles Gehäuse, Lichtstreuung).
 * Jede Lampe der Ziffer hat ihr eigenes Frequenzband (Bass unten, Höhen oben),
 * ein Lauflicht zirkuliert rund um die Ziffer, Onsets lassen zufällige Lampen
 * aufblitzen; eine niedrige Grundhelligkeit hält die Ziffer bei Stille lesbar.
 * Die übrigen Lampen glimmen wie beim Sunstrip unbeleuchtet mit.
 *
 * Eine Fabrik erzeugt alle zehn Presets aus je einer Bitmap; die Bitmap wird als
 * Konstanten in den Shader gebacken (kein Uniform-Upload pro Frame).
 *
 * @module visualizers/gl/presets/glLedDigits
 */

export const DIGIT_COLS = 5
export const DIGIT_ROWS = 7

/**
 * 5×7-Bitmaps für 0–9, Zeile 0 = oben, '#' = Lampe an. Klassische Dot-Matrix-Schrift.
 * @type {Record<number, string[]>}
 */
export const DIGIT_BITMAPS = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '#####'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '.###.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '..#..', '.##..'],
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

    // Jede Lampe hat ihr eigenes Frequenzband: Bass unten, Hoehen oben, leicht
    // ueber die Spalten gespreizt - 35 verschiedene Baender statt eines je Spalte.
    float band = (rowUp / (ROWS - 1.0)) * 0.72 + ((col + 0.5) / COLS) * 0.18;
    float e = spectrum(band) * uIntensity;
    // Kurzer Peak-Hold (~0.15 s) gegen nervoeses Flackern.
    float hold = 0.0;
    for (int i = 1; i <= 3; i++) hold = max(hold, history(band, float(i) * 0.03));
    float energy = max(e, hold * uIntensity * 0.8);

    // Zirkulation: ein Lauflicht wandert rund um die Ziffer (Winkel um die
    // Mitte), Tempo aus den Mitten; dazu ein langsames Hochlaufen.
    float ang = atan(rowUp + 0.5 - ROWS * 0.5, col + 0.5 - COLS * 0.5) / TAU;
    float chase = smoothstep(0.82, 1.0, fract(ang - t * (0.35 + mid * 0.6)));
    float rise = smoothstep(0.85, 1.0, fract((rowUp + 0.5) / ROWS - t * 0.2)) * 0.5;
    // Onset-Funken: bei Beats blitzen zufaellige Lampen kurz auf.
    float spark = step(0.6, hash12(vec2(col, row) + floor(t * 8.0))) * uOnset.w;

    // Grundhelligkeit haelt die Ziffer bei Stille dunkel lesbar; darauf legt
    // sich das eigene Band der Lampe, das Lauflicht und die Funken.
    float litOn = clamp(0.22 + smoothstep(0.05, 0.6, energy) * 0.75 + chase * 0.6 + rise + spark * 0.7 + bass * 0.1, 0.0, 1.0);
    // Unbeleuchtete Lampen glimmen bei Onsets minimal mit.
    float litOff = step(0.75, hash12(vec2(row, col) * 3.1 + floor(t * 6.0))) * uOnset.w * 0.14;
    float lit = mix(litOff, litOn, on);

    // Farbe je Band (Bass -> Hoehen), das Lauflicht zieht den Ton leicht weiter.
    float hue = fract(uColorHsl.x + band * 0.4 + chase * 0.08 - t * 0.02);
    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    // Beleuchtete Linsen atmen leicht mit dem Bass.
    float R = cell * uLensSize * (1.0 + bass * 0.06 * on);
    vec4 lamp = ledLamp(lp, R, aaPx, lit, ledCol, ledDim, ledHot, edgeMask);
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
 * @param {0|1|2|3|4|5|6|7|8|9} digit
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

export const glLedDigit0 = makeLedDigitPreset(0)
export const glLedDigit1 = makeLedDigitPreset(1)
export const glLedDigit2 = makeLedDigitPreset(2)
export const glLedDigit3 = makeLedDigitPreset(3)
export const glLedDigit4 = makeLedDigitPreset(4)
export const glLedDigit5 = makeLedDigitPreset(5)
export const glLedDigit6 = makeLedDigitPreset(6)
export const glLedDigit7 = makeLedDigitPreset(7)
export const glLedDigit8 = makeLedDigitPreset(8)
export const glLedDigit9 = makeLedDigitPreset(9)
