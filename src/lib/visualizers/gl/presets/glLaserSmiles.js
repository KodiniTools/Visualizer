/**
 * GPU presets: Laser-Smileys – fünf Gesichter als Laser-Strichzeichnung
 * (Kreis, Augen, Mund) im Look der Laser-Figuren: knackiger Kern, weicher
 * Halo, Höhen-Flimmern und eine leicht versetzte Geisterspur. Jedes Gesicht
 * ist aus Abstandsfunktionen (Kreisring, Bogen, Strecke, Ellipsenring)
 * zusammengesetzt und reagiert auf seine Art auf die Musik:
 *
 *   - Fröhlich: Lächeln wird mit dem Bass breiter, Kopf hüpft auf Beats
 *   - Zwinkern: das rechte Auge zwinkert auf Beats, schiefes Grinsen
 *   - Lachen:   zugekniffene Augen, der Mund öffnet sich mit der Lautstärke,
 *               der Kopf wackelt vor Lachen
 *   - Cool:     Sonnenbrille mit Höhen-Glanz, Kopf wiegt sich zu den Mitten
 *   - Staunen:  runde Augen mit wandernden Pupillen, O-Mund pumpt mit dem
 *               Bass, Augenbrauen heben sich auf Beats
 *
 * Der Variantenrumpf definiert `face(q, part)`: Abstand zur nächsten Linie
 * (in Canvas-Höheneinheiten) und die Teil-Nummer für den Farbton.
 *
 * @module visualizers/gl/presets/glLaserSmiles
 */

import { retroOscilloscope } from '../../retro/retroOscilloscope.js'

/**
 * Varianten: id-Suffix, Namen und der GLSL-Rumpf von `face()`.
 * Im Rumpf stehen `q` (Punkt), `d` (bester Abstand), `part` (Teil-Nummer),
 * `t`, `bass`, `mid`, `treb`, `vol` zur Verfügung; ADD(dist, id) übernimmt
 * die nähere Linie.
 * @type {Record<string, {suffix: string, name_de: string, name_en: string, body: string}>}
 */
export const SMILE_VARIANTS = {
  happy: {
    suffix: 'Happy',
    name_de: 'Laser-Smiley Fröhlich (GPU)',
    name_en: 'Laser Smiley Happy (GPU)',
    body: /* glsl */ `
    // Kopf huepft auf Beats, atmet leicht mit der Lautstaerke.
    q.y -= uOnset.w * 0.03;
    float R = 0.36 * (1.0 + vol * 0.05);
    ADD(abs(length(q) - R), 0.0)
    // Augen: kleine Ringe, ruecken bei Beats etwas nach oben.
    vec2 eye = vec2(0.13, 0.11 + uOnset.w * 0.015);
    ADD(abs(length(q - eye) - 0.03), 1.0)
    ADD(abs(length(q - eye * vec2(-1.0, 1.0)) - 0.03), 1.0)
    // Mund: Laechelbogen, mit dem Bass breiter.
    float a = 0.75 - bass * 0.35;
    ADD(sdArc(q, vec2(0.0, 0.0), 0.22, PI + a, TAU - a), 2.0)`,
  },
  wink: {
    suffix: 'Wink',
    name_de: 'Laser-Smiley Zwinkern (GPU)',
    name_en: 'Laser Smiley Wink (GPU)',
    body: /* glsl */ `
    // Leicht schief gelegter Kopf.
    q = rot2(-0.12 + sin(t * 0.8) * 0.03) * q;
    float R = 0.36 * (1.0 + vol * 0.04);
    ADD(abs(length(q) - R), 0.0)
    // Linkes Auge offen; das rechte zwinkert auf Beats: Ring schrumpft zum
    // Punkt, ein waagrechter Strich waechst.
    vec2 eyeL = vec2(-0.13, 0.11);
    vec2 eyeR = vec2(0.13, 0.11);
    float w = smoothstep(0.25, 0.75, uOnset.w);
    ADD(abs(length(q - eyeL) - 0.03), 1.0)
    ADD(abs(length(q - eyeR) - 0.03 * (1.0 - w)) - 0.002, 1.0)
    ADD(sdSegment(q, eyeR - vec2(0.05 * w, 0.0), eyeR + vec2(0.05 * w, 0.0)), 1.0)
    // Schiefes Grinsen: rechts hoeher gezogen, mit dem Bass breiter.
    float a = 0.7 - bass * 0.3;
    ADD(sdArc(q, vec2(0.02, 0.0), 0.22, PI + a + 0.35, TAU - a), 2.0)`,
  },
  laugh: {
    suffix: 'Laugh',
    name_de: 'Laser-Smiley Lachen (GPU)',
    name_en: 'Laser Smiley Laugh (GPU)',
    body: /* glsl */ `
    // Der Kopf wackelt vor Lachen, staerker auf Beats.
    q = rot2(sin(t * 18.0) * 0.035 * (0.3 + uOnset.w)) * q;
    float R = 0.36 * (1.0 + vol * 0.05);
    ADD(abs(length(q) - R), 0.0)
    // Zugekniffene Augen: nach oben offene Boegen.
    vec2 eye = vec2(0.13, 0.11);
    ADD(sdArc(q, eye, 0.045, 0.35, PI - 0.35), 1.0)
    ADD(sdArc(q, eye * vec2(-1.0, 1.0), 0.045, 0.35, PI - 0.35), 1.0)
    // Weit offener Mund: Ellipse, oeffnet sich mit der Lautstaerke.
    vec2 mouth = vec2(0.0, -0.1);
    float open = 0.04 + vol * 0.14 + uOnset.w * 0.03;
    ADD(sdEllipseRing(q, mouth, vec2(0.2, open)), 2.0)
    // Zahnreihe: Linie im oberen Mundbereich.
    ADD(sdSegment(q, mouth + vec2(-0.14, open * 0.35), mouth + vec2(0.14, open * 0.35)), 3.0)`,
  },
  cool: {
    suffix: 'Cool',
    name_de: 'Laser-Smiley Cool (GPU)',
    name_en: 'Laser Smiley Cool (GPU)',
    body: /* glsl */ `
    // Wiegt sich gelassen zu den Mitten.
    q = rot2(sin(t * 2.0) * 0.05 * (0.4 + mid)) * q;
    float R = 0.36 * (1.0 + vol * 0.04);
    ADD(abs(length(q) - R), 0.0)
    // Sonnenbrille: zwei Glaeser, Steg und Buegel bis zum Kopfrand.
    vec2 lensL = vec2(-0.14, 0.1);
    vec2 lensR = vec2(0.14, 0.1);
    vec2 lensR2 = vec2(0.09, 0.055);
    ADD(sdEllipseRing(q, lensL, lensR2), 1.0)
    ADD(sdEllipseRing(q, lensR, lensR2), 1.0)
    ADD(sdSegment(q, vec2(-0.05, 0.1), vec2(0.05, 0.1)), 1.0)
    ADD(sdSegment(q, vec2(-0.23, 0.1), vec2(-R, 0.13)), 1.0)
    ADD(sdSegment(q, vec2(0.23, 0.1), vec2(R, 0.13)), 1.0)
    // Glanz auf den Glaesern: schraege Striche, die mit den Hoehen blitzen.
    float glint = 0.3 + treb * 0.7;
    ADD(sdSegment(q, lensL + vec2(-0.045, 0.03), lensL + vec2(0.0, -0.03)) + (1.0 - glint) * 0.02, 3.0)
    ADD(sdSegment(q, lensR + vec2(-0.045, 0.03), lensR + vec2(0.0, -0.03)) + (1.0 - glint) * 0.02, 3.0)
    // Laessiges, flaches Laecheln – mit dem Bass minimal breiter.
    float a = 0.95 - bass * 0.2;
    ADD(sdArc(q, vec2(0.0, 0.02), 0.24, PI + a, TAU - a), 2.0)`,
  },
  surprised: {
    suffix: 'Surprised',
    name_de: 'Laser-Smiley Staunen (GPU)',
    name_en: 'Laser Smiley Surprised (GPU)',
    body: /* glsl */ `
    // Kopf zuckt auf Beats leicht zurueck.
    q.y -= uOnset.w * 0.02;
    float R = 0.36 * (1.0 + vol * 0.05);
    ADD(abs(length(q) - R), 0.0)
    // Runde Augen mit Pupillen, die zu den Mitten umherwandern.
    vec2 eye = vec2(0.13, 0.11);
    vec2 look = vec2(sin(t * 0.9), cos(t * 0.7)) * 0.016 * (0.5 + mid);
    ADD(abs(length(q - eye) - 0.05), 1.0)
    ADD(abs(length(q - eye * vec2(-1.0, 1.0)) - 0.05), 1.0)
    ADD(abs(length(q - eye - look) - 0.014), 3.0)
    ADD(abs(length(q - eye * vec2(-1.0, 1.0) - look) - 0.014), 3.0)
    // Augenbrauen heben sich auf Beats.
    float lift = 0.075 + uOnset.w * 0.03;
    ADD(sdArc(q, eye + vec2(0.0, lift), 0.06, 0.45, PI - 0.45), 1.0)
    ADD(sdArc(q, eye * vec2(-1.0, 1.0) + vec2(0.0, lift), 0.06, 0.45, PI - 0.45), 1.0)
    // O-Mund pumpt mit dem Bass.
    ADD(abs(length(q - vec2(0.0, -0.13)) - (0.045 + bass * 0.07)), 2.0)`,
  },
}

/**
 * Fragment-Shader für eine Variante.
 * @param {string} body - GLSL-Rumpf von face()
 * @returns {string}
 */
function buildFrag(body) {
  return /* glsl */ `
uniform float uGhost;

#define ADD(dist, id) { float dd_ = (dist); if (dd_ < d) { d = dd_; part = (id); } }

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * h);
}

// Kreisbogen um c mit Radius r von Winkel a0 bis a1 (a0 < a1, Bogenmass,
// gegen den Uhrzeigersinn ab +x). Ausserhalb des Winkelbereichs zaehlt der
// Abstand zum naechsten Endpunkt.
float sdArc(vec2 p, vec2 c, float r, float a0, float a1) {
  vec2 v = p - c;
  float ang = atan(v.y, v.x);
  float mid = (a0 + a1) * 0.5;
  // Winkel relativ zur Bogenmitte in -PI..PI bringen.
  float rel = mod(ang - mid + PI, TAU) - PI;
  float halfSpan = (a1 - a0) * 0.5;
  if (abs(rel) <= halfSpan) return abs(length(v) - r);
  vec2 e0 = c + vec2(cos(a0), sin(a0)) * r;
  vec2 e1 = c + vec2(cos(a1), sin(a1)) * r;
  return min(length(p - e0), length(p - e1));
}

// Ellipsenring (Naeherung ueber die skalierte Kreisdistanz).
float sdEllipseRing(vec2 p, vec2 c, vec2 rad) {
  vec2 v = (p - c) / rad;
  return abs(length(v) - 1.0) * min(rad.x, rad.y);
}

// Abstand zur naechsten Linie des Gesichts + Teil-Nummer fuer den Farbton.
float face(vec2 q, float t, float bass, float mid, float treb, float vol, out float part) {
  float d = 1e9;
  part = 0.0;
${body}
  return d;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float aaPx = 1.0 / uResolution.y;
  float t = uTime;
  float bass = uBands.x;
  float mid = uBands.y;
  float treb = uBands.z;
  float vol = uBands.w;

  float part;
  float d = face(p, t, bass, mid, treb, vol, part);

  float px = d / aaPx;
  float core = 1.0 - smoothstep(0.6, 1.9, px);
  float halo = exp(-px * 0.08) * 0.45;
  float flick = 0.9 + 0.1 * sin(t * 50.0) * treb;

  float hue = fract(uColorHsl.x + part * 0.12 + t * 0.02);
  vec3 col = hsl2rgb(vec3(hue, 0.95, 0.55));
  vec3 hot = hsl2rgb(vec3(hue, 0.3, 0.95));
  vec3 rgb = mix(col, hot, core) * (core + halo) * flick;
  float alpha = (core + halo) * flick;

  // Geisterspur: leicht gedrehte, groessere Kopie, mit den Hoehen sichtbar.
  float part2;
  vec2 p2 = rot2(0.06) * p * 1.04;
  float d2 = face(p2, t, bass, mid, treb, vol, part2);
  float ghost = laserGlow(d2 / aaPx) * treb * uGhost;
  rgb += hsl2rgb(vec3(fract(hue + 0.5), 0.9, 0.6)) * ghost;
  alpha += ghost;

  fragColor = outPremul(rgb, alpha);
}
`
}

/**
 * Erzeugt das Preset einer Smiley-Variante.
 * @param {keyof typeof SMILE_VARIANTS} variant
 */
export function makeLaserSmilePreset(variant) {
  const v = SMILE_VARIANTS[variant]
  if (!v) throw new Error(`Unbekannte Laser-Smiley-Variante ${variant}`)
  return {
    id: `glLaserSmile${v.suffix}`,
    name_de: v.name_de,
    name_en: v.name_en,
    frag: buildFrag(v.body),
    uniforms: () => ({ uGhost: 0.5 }),
    fallback: retroOscilloscope,
  }
}

export const glLaserSmileHappy = makeLaserSmilePreset('happy')
export const glLaserSmileWink = makeLaserSmilePreset('wink')
export const glLaserSmileLaugh = makeLaserSmilePreset('laugh')
export const glLaserSmileCool = makeLaserSmilePreset('cool')
export const glLaserSmileSurprised = makeLaserSmilePreset('surprised')
