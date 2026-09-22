# Refactoring-Vorschlag: `src/lib/textManager.js`

> Status: **abgeschlossen** – alle sieben Schritte umgesetzt. Nachfolge-Dokument zu
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
- ~~**Schritt 7 ist Verhaltens-relevant.**~~ Umgesetzt wie geplant: erst die
  Engine um den `levelOptions`-Pass-Through erweitert, dann der Text umgestellt,
  beides in einem eigenen Commit und abgesichert durch einen
  Golden-Master-Vergleich gegen die alte Implementierung. Die Annahme hat
  gehalten: `makeLevelResolver` bevorzugt explizite `attack`/`release`
  gegenüber `smoothing`, weshalb die Basis-Option der Engine den Text-Pfad
  nicht stört.
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

### ✅ Schritt 6 – Audio-reaktive Effektwerte (vor Schritt 5 gezogen)

`audio/textEffectValues.js` (215) mit `getAudioReactiveValues` und
`calculateTextEffectValue`. Vorgezogen, weil `drawText` die Werte braucht – so
importiert das Render-Modul direkt statt einen Callback durchzureichen, der
gleich danach wieder verschwunden wäre.

Die 33 `no-case-declarations` sind damit weg: zehn `case`-Zweige mit
Deklarationen sind jetzt Blöcke. Verhaltensneutral, da jeder betroffene Zweig
mit `return` endet – maschinell verifiziert, dass sich ohne Klammern und
Einrückung wieder exakt der Vorzustand ergibt. `textManager.js` ist seither
eslint-frei.

### ✅ Schritt 5 – drawText aufgeteilt

`render/effects.js` (19), `render/transform.js` (203), `render/filters.js` (58),
`render/textLines.js` (173), `render/drawText.js` (85).

`activeEffects()` ersetzt das 20-fach wiederholte
`audioReactive && audioReactive.hasEffects && audioReactive.effects.X`.
`computeTextTransform` ist eine reine Funktion und ohne Canvas testbar.

Zwei Dinge sind dabei bewusst festgehalten:

- **Reihenfolge der Animations-Aufrufe**: Fade und Anzeigedauer laufen VOR Slide
  und Scale, weil `getDisplayOpacity` die Startzeitpunkte der anderen
  Animationen liest. Im Modul kommentiert und durch einen Test abgesichert.
- **Ein Zeitpunkt pro Frame**: `drawText` nimmt `now` als Parameter, statt
  `Date.now()` an sechs Stellen einzeln zu lesen.

Verifiziert per **Golden Master**: eine Kopie der alten Implementierung lief
gegen dieselbe aufgezeichnete Canvas-Aufrufsequenz – 15 Szenarien über je sechs
Frames, mit fixierter Zeit und fixiertem `Math.random`. Alle Sequenzen
identisch. Der Vergleich war Wegwerf; dauerhaft bleiben 32 Unit-Tests in
`textRender.spec.js`.

### Ergebnis

|                           | vorher        | nachher                                 |
| ------------------------- | ------------- | --------------------------------------- |
| `textManager.js`          | 1.785 Zeilen  | **333**                                 |
| Module                    | 1 Datei       | 22 (zusammen 1.851 Zeilen, inkl. JSDoc) |
| größte Datei im Bereich   | 1.785         | 195 (`audio/textEffectValues.js`)       |
| Tests für den TextManager | 0             | 147                                     |
| eslint / oxlint           | 33 / 3 Fehler | 0 / 0                                   |
| Tests gesamt              | 457           | 536                                     |

Jede Datei im Bereich liegt unter 200 Zeilen.

### ✅ Schritt 7 – Engine-Dedup

`computeAudioReactiveValues` nimmt einen optionalen fünften Parameter
`levelOptions`, der in die Resolver-Optionen gespreadet wird. Der Text-Pfad
besteht nur noch aus `textLevelOptions()` und dem Aufruf der Engine – 45 Zeilen
weniger Duplikat. Die vier bestehenden Aufrufstellen (canvasManager,
videoManager, TickerRenderer, Engine-Tests) bleiben unverändert; ohne
`levelOptions` verhält sich die Engine exakt wie zuvor.

Verifiziert per **Golden Master**: 18 Konfigurationen (Smoothing 0/50/100,
Schwellen, Attack/Release-Varianten, Beat-Boost, Phase, Gain, Easing, Quelle
global und je Effekt, Intensität, alle 18 Text-Sonderfälle) über je neun Frames
eines Audio-Verlaufs (Anstieg, Halten, Abfall, Stille, Peak). Alle Werte
identisch – inklusive der zustandsbehafteten Hüllkurve, deren Variation über
die Frames eigens geprüft wurde, damit der Vergleich nicht trivial besteht.

Damit ist der `textManager`-Bereich auch vollständig lint-frei (oxlint und
eslint).

### Vorbestehende Befunde (nicht Teil dieses Refactorings)

- `src/__tests__/components/MultiLayerPopover.spec.js` erzeugt eine Unhandled
  Rejection (`el.scrollIntoView is not a function`, `VisualizerLayerPanel.vue:464`)
  – jsdom kennt `scrollIntoView` nicht. Besteht unabhängig von diesen Änderungen.
- ~~`eslint src/lib/textManager.js` meldet 33 × `no-case-declarations`~~ – in
  Schritt 6 behoben.
- ~~`oxlint` meldet in `textManager.js` ein leeres `catch (e)`~~ – in Schritt 7
  behoben (optional catch binding).
- ~~`_getTypewriterText` hat **keine** defensive `_state`-Initialisierung~~ – im
  Nacharbeits-Commit behoben, siehe unten.

---

## 9. Nacharbeit

### ✅ Fehlender Animations-Zustand

Der Befund war größer als notiert: nicht nur `getTypewriterText`, sondern **alle
vier `restart*`-Funktionen** griffen ungeschützt auf `animation._state` zu.
Alle Zugriffe laufen jetzt über `ensureAnimationState()`. Statt eines
TypeError wird der Zustand angelegt und die Animation läuft normal.

Dabei aufgefallen: die vier `restart*`-Methoden des `TextManager` werden
derzeit **nur von Tests** aufgerufen. Die UI (`useTextAnimations.js`,
`TextManagerPanel.vue`) baut ihren eigenen `_state`-Reset. Diese Duplikation
besteht weiter – sie zu vereinheitlichen wäre ein eigener Schritt.

### ✅ `render/transform.js` aufgeteilt

Der Schnitt folgt der Sache: `computeTextTransform` bestand aus drei
voneinander unabhängigen Teilen.

```
render/transform/opacity.js      Deckkraft + Strobe-Helligkeit    (48)
render/transform/position.js     Position, Slide, Bewegungspfade  (52)
render/transform/deformation.js  Skalierung, Drehung, Scherung    (77)
render/transform/apply.js        Canvas-Transformation            (47)
render/transform/index.js        Komposition + typedef            (65)
```

Die Reihenfolge-Abhängigkeit ist durch den Schnitt sichtbarer statt schwächer
geworden: `computeOpacity` wertet über `getDisplayOpacity` die Startzeitpunkte
aus, die `computePosition` und `computeDeformation` erst anlegen. Die
Komposition hält die Reihenfolge ein und kommentiert sie.

### ✅ Text-Strobe blendet wieder aus

Beim Testen der Phasen aufgefallen, **vorbestehend** und nicht durch das
Refactoring verursacht (der Golden-Master aus Schritt 5 bestätigt das):

```js
opacity = opacity * (fx.strobe.strobeOpacity || 1.0)
```

`calculateTextEffectValue('strobe', …)` liefert bei aktivem Strobe in rund 30%
der Frames `strobeOpacity: 0` – und `0 || 1.0` ergibt `1.0`. Der Text-Strobe
blinkte dadurch nie dunkel, nur seine Helligkeit schwankte.

Die Prüfung ist jetzt `!== undefined`, wie bei allen anderen Renderern
(`audioReactiveDraw.js:51`, `TickerRenderer.js:175`, `multiImageManager.js:867`).
`strobeBrightness` ist gleich mit angeglichen – derselbe Fallstrick, derzeit
ohne praktische Auswirkung, da der Effekt nie 0 liefert.

**Sichtbare Änderung:** Texte mit aktivem Strobe blitzen ab jetzt tatsächlich.
Damit verhalten sie sich wie Bilder, Kacheln und der Lauftext. Bei ~60 fps sind
das rund 18 dunkle Frames pro Sekunde, solange der Pegel über 60% liegt – ein
Stroboskop-Effekt, wie er für die übrigen Elemente schon immer galt.

Gegenprobe durchgeführt: mit dem alten Ausdruck schlägt der
Dunkel-Frame-Test fehl, mit dem Fix ist er grün.

### ✅ `loopDelay` 0 bedeutet wieder „keine Pause"

Gleiche Bug-Klasse, bei der Suche nach weiteren `||`-Fallen gefunden:

```js
const loopDelay = cfg.loopDelay || DEFAULT_LOOP_DELAY   // animation/timeline.js
if (timeSinceComplete >= (tw.loopDelay || 1000))        // animation/typewriter.js
```

Der Slider „Pause zwischen Wiederholungen" (`AnimationLoopControls.vue`) hat
`:min="0"`. Wer 0 einstellte – also _keine_ Pause zwischen den Wiederholungen
wollte – bekam trotzdem 1000 ms. Beide Stellen nutzen jetzt `??`; der
Typewriter hat dafür dieselbe benannte Konstante wie die Timeline bekommen.

**Sichtbare Änderung:** Loop-Animationen mit 0 ms Pause wiederholen sich ab
jetzt nahtlos. Alle anderen Einstellungen bleiben unverändert.

Gegenprobe durchgeführt: mit dem alten Ausdruck schlagen beide 0-ms-Tests
fehl, mit dem Fix sind sie grün.

### Geprüft und unkritisch

Alle übrigen `||`-Fallbacks im Text-Pfad sind unbedenklich, weil die
UI-Minimums den Wert 0 ausschließen: `slide.distance` (min 10), `duration`
(min 100), `typewriter.speed` (min 10), `stroke.width` (min 1),
`lineHeightMultiplier` (min 100). `displayDuration` prüft bereits korrekt auf
`!= null`, `startDelay` hat 0 als Default.
