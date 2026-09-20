# Refactoring-Vorschlag: `src/lib/textManager.js`

> Status: **Schritte 1–4 umgesetzt**, Schritte 5–7 offen. Nachfolge-Dokument zu
> `docs/REFACTORING-PLAN.md`, dort Zeile „`textManager.js` | 1.566 | Rendering/State trennen".
> Die vier dort genannten Kritik-Dateien (`visualizers.js`, `canvasManager.js`,
> `FotoPanel.vue`, `TextManagerPanel.vue`) sind inzwischen aufgeteilt –
> `textManager.js` ist mit **1.785 Zeilen** die größte verbliebene Quelldatei.

---

## 1. Ist-Zustand

Eine Klasse (`TextManager`), 31 Methoden, 1.785 Zeilen, fünf klar getrennte
Verantwortlichkeiten in einer Datei:

| Block                                                                                   | Zeilen                        | Umfang  | Aufgabe                                                                                      |
| --------------------------------------------------------------------------------------- | ----------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `add()` – Objekt-Defaults                                                               | 19–143                        | 125     | Factory für das Text-Objekt (Style, Schatten, Stroke, Audio, 4 Animationen)                  |
| Collection (`delete`, `restore`, `moveToTop`, `clear`, `getAllTexts`, `updateProperty`) | 144–175, 1513–1582, 1773–1785 | ~115    | Zustandshaltung der Text-Liste                                                               |
| Hit-Testing / Bounds                                                                    | 176–306                       | 131     | `findObjectAt`, `getObjectBounds`, `isPointInRect`                                           |
| Canvas-Style                                                                            | 307–377, 1440–1512            | 144     | `applyTextStyle(ForMeasurement)`, `resetShadow`, `applyTextStyleWithAudio`, `_strongestGlow` |
| **Animationen**                                                                         | 378–1055                      | **678** | Typewriter, Fade, Scale, Slide, `_getDisplayOpacity` + 4 `restart*`                          |
| **`drawText()`**                                                                        | 1056–1439                     | **384** | eine Methode: Opacity, Position, Transform, Filter, Zeilen-/Zeichen-Rendering, Cursor        |
| Audio-Reaktiv                                                                           | 1583–1772                     | 190     | `getAudioReactiveValues`, `_calculateTextEffectValue` (23-Fall-`switch`)                     |

### Konkrete Schmerzpunkte

1. **Dreifache Duplikation der Animations-Zustandsmaschine.**
   `_getFadeOpacity` (154 Z.), `_getScaleValue` (165 Z.) und `_getSlideOffset` (200 Z.)
   sind bis auf die Wertabbildung identisch: gleicher Delay → In → Hold → Out →
   Loop-Ablauf, gleiches `switch (direction)` mit `in`/`out`/`inOut`, gleiches
   Loop-Handling inkl. identischer `cycle`-Formel.
2. **`applyEasing` dreimal inline definiert** (Z. 506, 660, 844) – byte-identische Kopien.
3. **`drawText()` mit 384 Zeilen** vermischt sechs Ebenen (Opacity-Kette,
   Positions-Offsets, Transform-Matrix, CSS-Filter-String, Zeilen-/Wave-/Glitch-
   Rendering, Typewriter-Cursor). 20 Mal wiederholt sich das Idiom
   `if (audioReactive && audioReactive.hasEffects && audioReactive.effects.X)`.
4. **Defensive `_state`-Initialisierung dreimal kopiert** (Z. 481, 635, 800) –
   in `_getTypewriterText` fehlt sie, dort ist `animation._state` unbewacht (Z. 388).
5. **`Date.now()` direkt in der Logik** (15 Stellen) – Animationen sind ohne
   Fake-Timer nicht testbar; für `textManager.js` existiert aktuell **kein Unit-Test**
   (nur indirekt über `src/__tests__/canvas/DeletionUndo.spec.js`).
6. **`getAudioReactiveValues` dupliziert `audio/audioReactiveEngine.js`.**
   Die Schleife ist Zeile für Zeile identisch zu `computeAudioReactiveValues`;
   einziger Unterschied: Text übergibt `threshold`/`attack`/`release`/`preSmoothing`
   an `makeLevelResolver`, die Engine reicht nur `smoothing` durch.
7. **Gekapselte Methode wird von außen benutzt:**
   `canvasManager/rendering/SceneRenderer.js:118` ruft `tm._getDisplayOpacity(textObj)`.

---

## 2. Zielstruktur

Gleiches Muster wie beim bereits refaktorierten `canvasManager.js`
(Fassade + Unterordner, öffentliche API unverändert):

```
src/lib/textManager.js                     # Fassade/Orchestrator      ~170 Zeilen
src/lib/textManager/
├── index.js                               # Re-Exports                 ~15
├── createTextObject.js                    # add()-Defaults als Factory ~120
├── geometry/textBounds.js                 # Bounds + Hit-Test          ~150
├── style/textStyle.js                     # Style/Shadow/Stroke/Glow   ~150
├── animation/
│   ├── easing.js                          # applyEasing (1x)            ~25
│   ├── timeline.js                        # gemeinsame Zustandsmaschine ~90
│   ├── typewriter.js                      #                             ~95
│   ├── fade.js                            # nutzt timeline              ~40
│   ├── scale.js                           # nutzt timeline              ~50
│   ├── slide.js                           # nutzt timeline              ~70
│   └── displayOpacity.js                  #                             ~70
├── audio/textEffectValues.js              # Effekt-Wertetabelle         ~200
└── render/
    ├── drawText.js                        # Orchestrierung              ~90
    ├── transform.js                       # Opacity/Position/Scale/Skew ~110
    ├── filters.js                         # CSS-Filter-String            ~60
    └── textLines.js                       # Zeilen, Wave, Glitch, Cursor ~130
```

Ergebnis: ~1.785 → ~1.500 Zeilen verteilt auf 15 Module, keine Datei > 200 Zeilen.

### Öffentliche API bleibt unverändert

Extern verwendet werden (alle Aufrufstellen geprüft):

| Methode                                       | Aufrufer                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `add`, `delete`, `restore`, `getObjectBounds` | `lib/canvasManager.js`                                                                                |
| `moveToTop`                                   | `canvasManager/interaction/SelectionManager.js`                                                       |
| `draw`                                        | `composables/useRenderLoop.js`, `canvasManager/rendering/SceneRenderer.js`                            |
| `_getDisplayOpacity`                          | `canvasManager/rendering/SceneRenderer.js:118`                                                        |
| `restartTypewriter/Fade/Scale/Slide`          | `composables/useTextAnimations.js` (eigene State-Resets)                                              |
| Konstruktor                                   | `components/MainCanvas.vue`, `composables/useCanvasSetup.js`, `__tests__/canvas/DeletionUndo.spec.js` |

`_getDisplayOpacity` wird bei der Gelegenheit zu `getDisplayOpacity` umbenannt
(Alias auf den alten Namen beibehalten, damit `SceneRenderer` in einem separaten
Commit nachzieht).

---

## 3. Kernstück: gemeinsame Timeline

Fade, Scale und Slide lassen sich **verlustfrei** auf einen normalisierten
Fortschritt `p ∈ [0,1]` abbilden – nachgerechnet gegen alle Zweige des
bestehenden Codes:

| Animation | Wert aus `p`                               | `p = 0`        | `p = 1`      |
| --------- | ------------------------------------------ | -------------- | ------------ |
| Fade      | `opacity = p`                              | 0 (unsichtbar) | 1            |
| Scale     | `startScale + (endScale − startScale) · p` | `startScale`   | `endScale`   |
| Slide     | `offset = max · (1 − p)`                   | `max` (außen)  | 0 (Position) |

Das gilt für **alle** Phasen inkl. Start-Delay (`out` → `p=1`, sonst `p=0`),
Hold-Phase (`p=1`), Ausgang (`p=1−e`), Abschluss (`out`/`inOut` → `p=0`,
`in` ohne Hold → `p=1`) und Loop-Neustart. Damit:

```js
// src/lib/textManager/animation/timeline.js
/**
 * Gemeinsame Zustandsmaschine für Fade/Scale/Slide.
 * @returns {{p: number, isComplete: boolean}} p = normalisierter Fortschritt 0..1
 */
export function resolveTimeline(cfg, state, stateKey, now = Date.now()) {
  /* … */
}
```

```js
// src/lib/textManager/animation/fade.js
import { resolveTimeline } from './timeline.js'

export function getFadeOpacity(textObj, now = Date.now()) {
  const fade = textObj.animation?.fade
  if (!fade?.enabled) return { opacity: 1, isComplete: true }
  ensureState(textObj.animation)
  const { p, isComplete } = resolveTimeline(fade, textObj.animation._state, 'fadeStartTime', now)
  return { opacity: p, isComplete }
}
```

Einsparung: 519 → ~270 Zeilen, ein einziger Ort für Timing-Bugs.

---

## 4. Umsetzung in 7 Schritten

Jeder Schritt ist für sich lauffähig, commit-bar und ohne Verhaltensänderung
(reine Verschiebung, außer wo markiert).

| #   | Schritt                                                                                                                                                                                                                                                                                                                              | Risiko  | Netto-Zeilen |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------ |
| 1   | ✅ **Characterization-Tests zuerst**: `src/__tests__/canvas/textManager.spec.js` mit `vi.useFakeTimers()` – Snapshot der Rückgabewerte von `_getFadeOpacity`/`_getScaleValue`/`_getSlideOffset`/`_getTypewriterText` über alle 3 Richtungen × permanent/`displayDuration` × loop, plus `getObjectBounds` gegen ein jsdom-Canvas-Stub | –       | +250 (Test)  |
| 2   | ✅ `createTextObject.js`, `geometry/textBounds.js`, `style/textStyle.js` herauslösen (1:1-Verschiebung, Fassade delegiert)                                                                                                                                                                                                           | niedrig | ±0           |
| 3   | `animation/easing.js` + `animation/typewriter.js` + `animation/displayOpacity.js`; `now`-Parameter einführen (Default `Date.now()`)                                                                                                                                                                                                  | niedrig | −40          |
| 4   | `animation/timeline.js` einführen, Fade/Scale/Slide darauf umstellen – **gegen die Tests aus Schritt 1 grün**                                                                                                                                                                                                                        | mittel  | −250         |
| 5   | `drawText` aufteilen in `render/transform.js`, `render/filters.js`, `render/textLines.js`                                                                                                                                                                                                                                            | mittel  | −30          |
| 6   | `audio/textEffectValues.js` herauslösen (`_calculateTextEffectValue` als reine Funktion, testbar ohne Canvas)                                                                                                                                                                                                                        | niedrig | ±0           |
| 7   | _(optional, eigener PR)_ `computeAudioReactiveValues` um `levelOptions` erweitern und `getAudioReactiveValues` darauf umstellen                                                                                                                                                                                                      | mittel  | −45          |

---

## 5. Risiken & Fallstricke

- **⚠️ `audio/EasingFunctions.js` NICHT wiederverwenden.** Die Kurven sind
  unterschiedlich: `EasingFunctions.easeIn` ist kubisch (`t³`), die inline-Variante
  im `textManager` ist quadratisch (`t²`); `easeOut` analog (`1−(1−t)³` vs.
  `1−(1−t)²`). Ein „Aufräumen" per Import würde jede bestehende Text-Animation
  sichtbar verändern. → Eigene `animation/easing.js` mit den **quadratischen**
  Kurven, Dedup-Frage separat entscheiden.
- **Schritt 7 ist Verhaltens-relevant.** `makeLevelResolver` bevorzugt explizite
  `attack`/`release` gegenüber `smoothing`; die Engine reicht diese Felder heute
  nicht durch. Erst die Engine erweitern (`levelOptions`-Pass-Through, abgedeckt
  durch `src/__tests__/audio/audioReactiveEngine.spec.js`), dann Text umstellen –
  nicht in einem Commit mit den Verschiebungen.
- **`_state`-Mutation bleibt Nebeneffekt.** Die Animationsfunktionen schreiben
  `startTime`/`fadeStartTime`/… in das Objekt. Das ist gewollt (Render-Loop-State),
  muss aber in den extrahierten Funktionen erhalten bleiben – sonst starten
  Animationen jeden Frame neu. Deshalb `state` explizit als Parameter, kein
  internes Caching.
- **`useTextAnimations.js` setzt `_state` selbst zurück** (Z. 111–275) und kennt
  die Feldnamen `fadeStartTime`/`scaleStartTime`/`slideStartTime`. Die Timeline
  muss dieselben Schlüssel verwenden, sonst brechen die Restart-Buttons.
- **Animations-Defaults liegen an 6 Stellen** (`textManager.js:76`,
  `textDefaults.js:33`, `useTextAnimations.js:10`, `useNewTextSettings.js:151`,
  `TextManagerPanel.vue:239`, `text-new-form/buildAnimation.js:31`). Diese
  Konsolidierung ist ein **eigenes** Thema (Store-Ebene) – bewusst nicht Teil
  dieses Refactorings, sonst wird der Diff unprüfbar.
- **Kein `ctx.save()`/`restore()`-Ungleichgewicht einbauen**: `drawText` macht
  genau ein `save()` am Anfang und setzt Schatten + `filter` explizit vor
  `restore()` zurück. Beim Aufteilen darf kein Teilmodul selbst `restore()` rufen.

---

## 6. Tests

```bash
npm run test:unit -- textManager   # Schritte 1–6
npm run test:unit                  # Regression gesamt
npm run lint && npm run format:check
npm run test:e2e                   # Canvas-Interaktion (Auswahl, Drag, Rendering)
```

Neu abzudecken (bisher ungetestet):

- `resolveTimeline` – 3 Richtungen × `permanent`/`displayDuration` × `loop`
- `getObjectBounds` – mehrzeilig, `letterSpacing`, Stroke, Schatten-Offset, Alignment
- `calculateTextEffectValue` – deterministische Fälle (`hue`, `brightness`, `scale`,
  `opacity` mit `minimum`, `strokeWidth`); zeit-/zufallsbasierte Fälle mit
  gestubbtem `Date.now()`/`Math.random()`
- `getTypewriterText` – Start-Delay, Teiltext, Loop-Neustart, `_state`-Schutz

---

## 7. Nächstgrößte Kandidaten (nach `textManager.js`)

| Datei                              | Zeilen | Hinweis                                           |
| ---------------------------------- | ------ | ------------------------------------------------- |
| `src/lib/multiImageManager.js`     | 1.632  | gleiches Muster (Objekt-Factory + Render + Audio) |
| `src/composables/useBgSettings.js` | 1.575  | ein Composable, vermutlich mehrere Concerns       |
| `src/components/BlogPage.vue`      | 1.528  | Inhalt/Markup trennen                             |
| `src/lib/canvasManager.js`         | 1.319  | trotz Aufteilung weiterhin groß                   |
| `server/routes/api.js`             | 1.122  | Routen nach Domäne splitten                       |

---

## 8. Umsetzungsstand

### ✅ Schritt 1 – Characterization-Tests

`src/__tests__/canvas/textManager.spec.js`, 68 Tests mit `vi.useFakeTimers()`.
Drei Eigenheiten sind bewusst als „Quirk" festgeschrieben:

- Der erste Typewriter-Frame zeigt bereits ein Zeichen (`substring(0, index + 1)`).
- Die Zustandsmaschinen starten erst beim **ersten Aufruf**, nicht beim Aktivieren –
  eine Animation, die erst nach 300 ms zum ersten Mal abgefragt wird, beginnt dort.
- Bei `hold === 0` startet das Ausblenden von `inOut` bei `opacity === 1`
  (`elapsed === duration` fällt bereits in die Ausgangs-Phase).

### ✅ Schritt 2 – Factory, Bounds und Style extrahiert

`textManager.js`: **1.785 → 1.467 Zeilen**. Neu: `createTextObject.js` (136),
`geometry/textBounds.js` (147), `style/textStyle.js` (160), `index.js` (17).
Die neun betroffenen Methoden bleiben als delegierende Fassade erhalten, die
Rümpfe wurden per Brace-Matching übernommen und maschinell gegen den
Vorzustand verglichen.

Eine inhaltliche Änderung: die toten Variablen `textWidth`/`textHeight` in
`getObjectBounds` sind entfernt – sie wurden zugewiesen und fortgeschrieben,
aber nie gelesen. Damit sind die neuen Module oxlint- und eslint-frei.

Verifikation: 457 Unit-Tests grün, Prettier sauber, Produktions-Build ok.

### ✅ Schritt 3 – Easing, Zustand, Typewriter, Anzeigedauer

`animation/easing.js` (32), `animation/state.js` (22),
`animation/typewriter.js` (105), `animation/displayOpacity.js` (76).
Die Animationsfunktionen nehmen den Zeitpunkt jetzt als Parameter
(`now = Date.now()`) statt ihn selbst zu lesen.

`textAnimations.spec.js` prüft explizit, dass `applyEasing` **quadratisch**
rechnet und sich von `audio/EasingFunctions.js` (kubisch) unterscheidet –
damit ein späteres „Aufräumen" per Import nicht unbemerkt jede Text-Animation
verändert.

### ✅ Schritt 4 – Gemeinsame Timeline

`animation/timeline.js` (172) berechnet den normalisierten Fortschritt,
`fade.js` (46), `scale.js` (39) und `slide.js` (69) bilden ihn auf ihren Wert
ab. **480 → 326 Zeilen**, der Timing-Ablauf existiert nur noch einmal.
`textManager.js`: **1.785 → 876 Zeilen**.

Ein parametrisierter Test prüft den Abbildungsvertrag über sieben Zeitpunkte
für alle drei Animationen gemeinsam. Die 68 Characterization-Tests liefen
unverändert durch.

Eine Präzisierung: bei `p === 1` liefert Slide exakt `0` statt der
vorzeichenbehafteten `-0`, die `max * (1 - 1)` bei negativem `max` ergibt.
Numerisch identisch, aber der Vorzustand gab dort explizit `0` zurück.

### Offen

Schritte 5–7:

- **Schritt 5** – `drawText()` (384 Zeilen) in `render/transform.js`,
  `render/filters.js` und `render/textLines.js` aufteilen.
- **Schritt 6** – `audio/textEffectValues.js`; räumt zugleich die 33
  `no-case-declarations` auf.
- **Schritt 7** – Engine-Dedup, eigener PR (verhaltens-relevant).

### Vorbestehende Befunde (nicht Teil dieses Refactorings)

- `src/__tests__/components/MultiLayerPopover.spec.js` erzeugt eine Unhandled
  Rejection (`el.scrollIntoView is not a function`, `VisualizerLayerPanel.vue:464`)
  – jsdom kennt `scrollIntoView` nicht. Besteht unabhängig von diesen Änderungen.
- `eslint src/lib/textManager.js` meldet 33 × `no-case-declarations` – alle im
  `switch` von `_calculateTextEffectValue`, also Schritt 6.
- `oxlint` meldet in `textManager.js` ein leeres `catch (e) { /* ignore */ }` in
  `draw()`. Bewusst leer (Recording darf nicht abbrechen), aber der Parameter
  ließe sich entfernen.
- `_getTypewriterText` hat **keine** defensive `_state`-Initialisierung, anders
  als Fade/Scale/Slide: bei einem Text-Objekt ohne `animation._state` (etwa aus
  einem alten Preset) wirft es. Bewusst unverändert übernommen – eigener Fix,
  da es eine Verhaltensänderung wäre.
