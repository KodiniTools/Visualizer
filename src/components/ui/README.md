# UI-Komponenten

Bausteine des Design-Systems v2, übernommen aus dem Collage Maker
(`KodiniTools/Collage-Maker`, `src/components/ui/`, Stand `9dc4eca`; dort wiederum aus dem
Playlist Generator). Templates und Styles sind unverändert, nur `<script setup>` ist hier
JavaScript statt TypeScript (der Visualizer hat keinen TS-Parser in ESLint). Enum-Props prüfen
ihre Werte über `validator`.

Alle Komponenten:

- `<script setup>` mit `defineProps`/`defineModel`/`useId` (Vue 3.5).
- Styling ausschließlich über `--ds-*` Tokens aus `src/design-system/tokens-v2.css`, scoped CSS.
- Native Elemente (`<button>`, `<input>`, `<label>`, `<section>`), Fokus-Ring statt Glow.
- Icons kommen über Slots als Inline-SVG (Lucide-Stil, Stroke 1.75).
- Je ein Vitest unter `src/__tests__/components/ui/`.

```js
import { UiButton, UiPanel, UiTextField } from '@/components/ui'
```

| Komponente           | Zweck                                      | Wichtige Props / Events                                                                                                         |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `UiButton`           | Textbutton; `to` = RouterLink, `href` = a  | `variant` primary · secondary · ghost · danger, `size` sm · md · lg, `block`, Slot `icon`                                       |
| `UiIconButton`       | Quadratischer Icon-Button                  | `label` (Pflicht, wird aria-label und title), `variant` ghost · secondary · primary, `size` sm · md, `round`, `pressed`         |
| `UiPanel`            | Flache Fläche mit Kopfzeile                | `title`, `headingLevel` 2 · 3, `count`, `padded`, Slot `actions`                                                                |
| `UiCallout`          | Ruhiger Hinweis im Textfluss               | `type` info · success · warning · danger, `title`, Slot default                                                                 |
| `UiEmptyState`       | Leerzustand                                | `title`, `text`, Slots `icon` · `action`                                                                                        |
| `UiSegmentedControl` | Eine Option aus wenigen, Radiogroup-Muster | `v-model` (string), `options` `{ value, label, disabled? }`, `label`, `size`; Pfeiltasten wechseln                              |
| `UiSelect`           | Natives Select im System-Look              | `v-model` (string), `options`, `label` (Pflicht), `inline`, `labelHidden`, `size`; Attrs → select                               |
| `UiTextField`        | Einzeiliges Textfeld mit Label             | `v-model`, `label`, `hint`, `error` (aria-invalid, role=alert), `required`, `disabled`, Attrs → input                           |
| `UiDialog`           | Modaler Dialog (Teleport nach `body`)      | `open`, `title`, `description`, `closeLabel`, `size` md · lg, `teleportTo`, `id`, Slots default · `footer`; Event `close`       |
| `UiToast`            | Benachrichtigung                           | `message`, `type` success · error · warning · info, `actionLabel`, `dismissLabel`, `dismissOnClick`; Events `action`, `dismiss` |
| `UiKbd`              | Tastenkombination                          | `keys: string[]`                                                                                                                |

Abweichungen zum Collage Maker (bewusst, minimal):

- `UiToast` kennt zusätzlich `type="warning"` (der Toast-Store des Visualizers nutzt ihn).
- `closeLabel` (UiDialog) und `dismissLabel` (UiToast) fallen auf i18n `common.close` zurück.

## Visualizer-eigene Primitive auf derselben Anatomie

| Komponente                           | Entsprechung im Collage Maker                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SliderField` + `slider-control.css` | `ControlSlider` + `ResetButton` + Range-Regeln aus `style.css`: Spur 6 px `ds-border-strong`, Daumen 14 px `ds-accent`, Zahlenfeld `ds-control-sm` mono, Reset = `UiIconButton size="sm"` |
| `SliderControl`                      | Slider-Zeile: Label `ds-eyebrow` · SliderField · Wert `ds-kbd`                                                                                                                            |
| `ColorField`                         | `ControlColorInput`; Panel auf dem Overlay-Rezept (ds-surface-1, ds-border, ds-shadow-overlay)                                                                                            |

## Einsatz im Visualizer

| Stelle                         | Komponente                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Statushinweis im rechten Panel | `StatusBanner` → `UiCallout`                                                              |
| Admin-Login                    | `LoginModal` → `UiDialog` + `UiTextField` + `UiButton`                                    |
| Toasts                         | `ToastContainer` auf dem `UiToast`-Rezept, Aktion/Schließen als `UiButton`/`UiIconButton` |
| Popover der Player-Leiste      | `popover-chrome.css` auf dem Overlay-Rezept, Schließen als Ghost-Icon-Button              |
| Player-Leiste                  | Transport = runde Icon-Buttons (secondary), Play/Pause = primär                           |

## Regeln

- Keine Gradients, kein Glow, keine Scale-Hover. Hover ändert nur Farbe, 150 ms.
- Ein Rahmen (1 px), drei Radien (`--ds-radius-sm | -md | -lg`), Schatten nur in Toast, Dialog, Popover.
- Primär ist die einzige Goldfläche pro Ansicht; Umschalter zeigen „an“ als primär.
- Gold ist im Light Theme nie Textfarbe: Akzent-Text läuft über `--accent-ink` (Dark: Gold, Light: Text).
- Danger ist textbasiert (`variant="danger"`), Vollfläche nie.
