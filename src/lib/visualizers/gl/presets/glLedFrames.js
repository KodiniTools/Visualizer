/**
 * GPU presets: LED-Rahmen – ein Kranz runder LED-Lampen im Sunstrip-Stil
 * (Linsen, Fassung, Bloom, dunkles Gehäuse) entlang des Canvas-Randes. Fünf
 * Varianten teilen sich Geometrie, Gehäuse und Lampen-Rendering und
 * unterscheiden sich nur in der Regel, die Helligkeit und Farbton je Lampe
 * bestimmt:
 *
 *   - Lauflicht:  mehrere Lichtköpfe laufen im Tempo der Mitten um den Rahmen
 *   - Spektrum:   jede Lampe ist ein Frequenzband, Bass unten, Höhen oben
 *   - VU-Meter:   der Rahmen füllt sich von unten nach oben mit dem Pegel
 *   - Beat-Puls:  Wellen laufen von den Ecken die Kanten entlang, Beats blitzen
 *   - Regenbogen: Wechselblinker (gerade/ungerade) mit rotierendem Regenbogen
 *
 * Lampen-Koordinaten im Shader:
 *   s    0..1 entlang des Umfangs, im Uhrzeigersinn ab links unten
 *   sym  0 = Mitte unten, 1 = Mitte oben, links und rechts gespiegelt
 *   corn 0 = an einer Ecke, 1 = Mitte einer Kante
 *   k    Lampen-Index 0..P-1
 *
 * @module visualizers/gl/presets/glLedFrames
 */

/** Lampen entlang der kurzen (vertikalen) Kante. */
export const FRAME_LAMPS = 12

/**
 * Varianten: id-Suffix, Namen und der GLSL-Rumpf, der aus s/sym/corn/k
 * die Werte `lit` (0..1) und `hue` (0..1) setzt.
 * @type {Record<string, {suffix: string, name_de: string, name_en: string, rule: string}>}
 */
export const FRAME_VARIANTS = {
  chase: {
    suffix: 'Chase',
    name_de: 'LED-Rahmen Lauflicht (GPU)',
    name_en: 'LED Frame Chase (GPU)',
    rule: /* glsl */ `
    // Drei Lichtköpfe mit Schweif laufen im Uhrzeigersinn, ein feineres
    // Lauflicht gegenläufig; Beats lassen den ganzen Rahmen kurz aufblitzen.
    float speed = 0.22 + mid * 0.7;
    float run = smoothstep(0.78, 1.0, fract(s * 3.0 - t * speed));
    float run2 = smoothstep(0.92, 1.0, fract(-s * 6.0 - t * speed * 1.7)) * 0.55;
    lit = clamp(0.12 + run * 0.9 + run2 + uOnset.w * 0.45 + bass * 0.12, 0.0, 1.0);
    hue = fract(uColorHsl.x + s * 0.5 + t * 0.03);`,
  },
  spectrum: {
    suffix: 'Spectrum',
    name_de: 'LED-Rahmen Spektrum (GPU)',
    name_en: 'LED Frame Spectrum (GPU)',
    rule: /* glsl */ `
    // Jede Lampe hat ihr Frequenzband: Bass in der Mitte unten, Höhen in der
    // Mitte oben, beide Seiten spiegeln sich. Kurzer Peak-Hold gegen Flackern.
    float band = sym * 0.85;
    float e = spectrum(band) * uIntensity;
    float hold = 0.0;
    for (int i = 1; i <= 3; i++) hold = max(hold, history(band, float(i) * 0.03));
    float energy = max(e, hold * uIntensity * 0.85);
    lit = clamp(0.1 + smoothstep(0.04, 0.55, energy) * 0.95 + uOnset.x * (1.0 - sym) * 0.25, 0.0, 1.0);
    hue = fract(uColorHsl.x + sym * 0.45);`,
  },
  vu: {
    suffix: 'Vu',
    name_de: 'LED-Rahmen VU-Meter (GPU)',
    name_en: 'LED Frame VU Meter (GPU)',
    rule: /* glsl */ `
    // Pegelanzeige: der Rahmen füllt sich von der Mitte unten über beide
    // Seiten bis zur Mitte oben; die Lampe an der Pegelgrenze leuchtet extra.
    // Bei 16:9 beginnt die obere Leiste erst bei sym ≈ 0.66 – deshalb wird der
    // Pegel komprimiert (Wurzel), damit sie schon bei mittlerer Lautstärke
    // mitspielt (vol 0.3 → 0.66, 0.5 → 0.85, 0.7 → 1.0); Beats heben ihn kurz an.
    // Der Bass treibt den Pegel mit an – er ist perkussiver als die geglättete
    // Lautstärke, so bewegt sich die Pegelgrenze sichtbar im Takt.
    float drive = max(vol, bass * 0.9) * uIntensity;
    float level = clamp(sqrt(max(drive, 0.0)) * 1.2 + uOnset.w * 0.12, 0.0, 1.0);
    float fill = 1.0 - smoothstep(level - 0.02, level + 0.02, sym);
    float peak = smoothstep(0.06, 0.0, abs(sym - level));
    // Der gefüllte Teil steht nicht still: er atmet mit dem Bass, und ein
    // Lauflicht steigt von der Mitte unten zur Pegelgrenze (Tempo aus den Mitten).
    float flow = smoothstep(0.7, 1.0, fract(sym * 4.0 - t * (0.5 + mid * 0.8)));
    float body = 0.35 + bass * 0.35 + flow * 0.35;
    // Über dem Pegel glimmt die Restskala leicht mit dem Pegel, statt tot zu bleiben.
    float rest = (1.0 - fill) * vol * 0.2;
    lit = clamp(0.1 + fill * body + peak * 0.5 + rest + uOnset.w * 0.15, 0.0, 1.0);
    // Vom Grundton unten zu warmen Tönen oben, wie eine klassische VU-Skala.
    hue = fract(uColorHsl.x + sym * 0.55);`,
  },
  pulse: {
    suffix: 'Pulse',
    name_de: 'LED-Rahmen Beat-Puls (GPU)',
    name_en: 'LED Frame Beat Pulse (GPU)',
    rule: /* glsl */ `
    // Wellen laufen von den vier Ecken zur Kantenmitte, der Bass lässt den
    // Rahmen atmen, Beats blitzen an den Ecken auf und verklingen zur Mitte.
    float wave = smoothstep(0.82, 1.0, fract(corn * 2.0 - t * (0.6 + mid * 0.6))) * (0.35 + uOnset.w * 0.65);
    float flash = uOnset.w * (1.0 - corn) * 0.7;
    lit = clamp(0.12 + bass * 0.35 + wave * 0.8 + flash, 0.0, 1.0);
    hue = fract(uColorHsl.x + corn * 0.25 + uOnset.w * 0.1);`,
  },
  rainbow: {
    suffix: 'Rainbow',
    name_de: 'LED-Rahmen Regenbogen (GPU)',
    name_en: 'LED Frame Rainbow (GPU)',
    rule: /* glsl */ `
    // Wechselblinker wie an einer Kirmes-Fassade: gerade und ungerade Lampen
    // wechseln sich ab, das Tempo folgt den Mitten; der Regenbogen dreht sich
    // um den Rahmen, Beats heben alle Lampen an.
    float phase = floor(t * (1.5 + mid * 3.0));
    float alt = mod(k + phase, 2.0);
    lit = clamp(0.15 + alt * (0.45 + vol * 0.55) + uOnset.w * 0.45, 0.0, 1.0);
    hue = fract(s + t * 0.08 + uColorHsl.x);`,
  },
}

/**
 * Fragment-Shader für eine Variante.
 * @param {string} rule - GLSL-Rumpf, setzt `lit` und `hue`
 * @returns {string}
 */
function buildFrag(rule) {
  return /* glsl */ `
uniform float uLamps;
uniform float uLensSize;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float vol = uBands.w;

  // Raster: ny Lampen entlang der Hoehe, nx entlang der Breite, quadratische
  // Zellen; der Rahmen fuellt das Canvas bis auf einen kleinen Rand.
  float ny = max(6.0, uLamps);
  float cell = 0.96 / ny;
  float nx = max(6.0, floor(aspect * 0.96 / cell));
  vec2 halfExt = vec2(nx, ny) * cell * 0.5;       // Aussenmass des Lampenkranzes
  float P = 2.0 * nx + 2.0 * ny - 4.0;         // Lampen am Umfang

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  // Gehaeuse: Ring zwischen Aussen- und Innenkante des Kranzes.
  float sdOuter = roundedBox(p, halfExt + cell * 0.12, cell * 0.22);
  float sdInner = roundedBox(p, halfExt - cell * 1.12, cell * 0.22);
  float housing = (1.0 - smoothstep(0.0, 2.0 * aaPx, sdOuter)) * smoothstep(0.0, 2.0 * aaPx, sdInner);
  vec3 housingCol = hsl2rgb(vec3(uColorHsl.x, 0.2, 0.08));
  rgb += housingCol * housing;
  alpha += housing * 0.92;

  // Zelle bestimmen: Spalte/Zeile im Raster (0..nx-1, 0..ny-1, y nach oben).
  vec2 g = (p + halfExt) / cell;
  bool inside = g.x >= 0.0 && g.x < nx && g.y >= 0.0 && g.y < ny;
  float col = floor(g.x);
  float row = floor(g.y);
  bool onRing = inside && (row < 1.0 || row >= ny - 1.0 || col < 1.0 || col >= nx - 1.0);
  if (onRing) {
    // Umfangs-Index k im Uhrzeigersinn ab links unten: unten (nach rechts),
    // rechts (nach oben), oben (nach links), links (nach unten).
    float k;
    if (row < 1.0) k = col;
    else if (col >= nx - 1.0) k = nx + (row - 1.0);
    else if (row >= ny - 1.0) k = nx + (ny - 2.0) + (nx - 1.0 - col);
    else k = 2.0 * nx + (ny - 2.0) + (ny - 2.0 - row);
    float s = (k + 0.5) / P;

    // sym: 0 = Mitte unten, 1 = Mitte oben, links/rechts gespiegelt.
    // (s - sBottom) ist der Umfangsabstand zur Mitte unten; +0.5 und fract
    // legen die Mitte unten auf 0.5, der Betrag der Abweichung davon (x2)
    // ergibt 0 unten und 1 gegenüber (Mitte oben).
    float sBottom = (nx * 0.5) / P;
    float sym = clamp(abs(fract(s - sBottom + 0.5) * 2.0 - 1.0), 0.0, 1.0);

    // corn: Abstand zur naechsten Ecke entlang der Kante, 0 = Ecke, 1 = Kantenmitte.
    float ex = min(col, nx - 1.0 - col);
    float ey = min(row, ny - 1.0 - row);
    float edgeDist = (row < 1.0 || row >= ny - 1.0) ? ex : ey;
    float halfEdge = (row < 1.0 || row >= ny - 1.0) ? (nx - 1.0) * 0.5 : (ny - 1.0) * 0.5;
    float corn = clamp(edgeDist / max(halfEdge, 1.0), 0.0, 1.0);

    vec2 lp = (fract(g) - 0.5) * cell;
    float lit = 0.0;
    float hue = uColorHsl.x;
${rule}

    vec3 ledCol = hsl2rgb(vec3(hue, 0.95, 0.55));
    vec3 ledDim = hsl2rgb(vec3(hue, 0.7, 0.13));
    vec3 ledHot = hsl2rgb(vec3(hue, 0.45, 0.93));
    float edgeMask = 1.0 - smoothstep(cell * 0.38, cell * 0.49, max(abs(lp.x), abs(lp.y)));
    float R = cell * uLensSize * (1.0 + bass * 0.05);
    vec4 lamp = ledLamp(lp, R, aaPx, lit, ledCol, ledDim, ledHot, edgeMask);
    rgb += lamp.rgb;
    alpha += lamp.a;
  }

  // Lichtstreuung vom Kranz nach innen (auf die Flaeche) und nach aussen.
  float dIn = max(-sdInner, 0.0);
  float spillIn = exp(-dIn * 9.0) * (0.12 + vol * 0.35) * step(0.0, -sdInner);
  float spillOut = exp(-max(sdOuter, 0.0) * 14.0) * (0.1 + vol * 0.25) * step(0.0, sdOuter);
  rgb += hsl2rgb(vec3(uColorHsl.x, 0.7, 0.55)) * (spillIn + spillOut);
  alpha += spillIn + spillOut;
  fragColor = outPremul(rgb, alpha);
}
`
}

/**
 * Canvas2D-Fallback (ohne WebGL2): derselbe Kranz mit einfachen Lampen; die
 * Helligkeit folgt dem Mittelwert des Spektrums, die Verteilung ist eine
 * einfache Pegelfuellung von unten nach oben.
 */
const fallback = {
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    let sum = 0
    const n = Math.min(bufferLength, dataArray.length)
    for (let i = 0; i < n; i++) sum += dataArray[i]
    const level = n ? Math.min(1, (sum / n / 255) * 1.6 * intensity) : 0

    const ny = FRAME_LAMPS
    const cell = (h * 0.96) / ny
    const nx = Math.max(6, Math.floor((w * 0.96) / cell))
    const fw = nx * cell
    const fh = ny * cell
    const x0 = (w - fw) / 2
    const y0 = (h - fh) / 2

    ctx.save()
    ctx.fillStyle = 'rgba(12, 14, 22, 0.92)'
    const pad = cell * 0.12
    ctx.beginPath()
    ctx.roundRect(x0 - pad, y0 - pad, fw + 2 * pad, fh + 2 * pad, cell * 0.22)
    ctx.roundRect(
      x0 + cell + pad,
      y0 + cell + pad,
      fw - 2 * cell - 2 * pad,
      fh - 2 * cell - 2 * pad,
      cell * 0.22,
    )
    ctx.fill('evenodd')

    for (let r = 0; r < ny; r++) {
      for (let c = 0; c < nx; c++) {
        const onRing = r === 0 || r === ny - 1 || c === 0 || c === nx - 1
        if (!onRing) continue
        const cx = x0 + (c + 0.5) * cell
        const cy = y0 + (r + 0.5) * cell
        // Pegelfuellung von unten (r = ny-1) nach oben (r = 0)
        const sym = 1 - r / (ny - 1)
        const lit = sym <= level ? 0.5 + level * 0.5 : 0.12
        const R = cell * 0.38
        ctx.globalAlpha = 0.3 + lit * 0.7
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(cx, cy, R, 0, Math.PI * 2)
        ctx.fill()
        if (lit > 0.2) {
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

/**
 * Erzeugt das Preset einer Rahmen-Variante.
 * @param {keyof typeof FRAME_VARIANTS} variant
 */
export function makeLedFramePreset(variant) {
  const v = FRAME_VARIANTS[variant]
  if (!v) throw new Error(`Unbekannte LED-Rahmen-Variante ${variant}`)
  return {
    id: `glLedFrame${v.suffix}`,
    name_de: v.name_de,
    name_en: v.name_en,
    frag: buildFrag(v.rule),
    uniforms: () => ({ uLamps: FRAME_LAMPS, uLensSize: 0.38 }),
    fallback,
  }
}

export const glLedFrameChase = makeLedFramePreset('chase')
export const glLedFrameSpectrum = makeLedFramePreset('spectrum')
export const glLedFrameVu = makeLedFramePreset('vu')
export const glLedFramePulse = makeLedFramePreset('pulse')
export const glLedFrameRainbow = makeLedFramePreset('rainbow')
