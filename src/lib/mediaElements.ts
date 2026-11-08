/**
 * Wurde das Medien-Element freigegeben (`src = ''` bzw. ohne src)?
 *
 * Beim Entfernen eines Videos wird `src` geleert, damit der Browser die
 * Ressource freigibt. Das löst ein `error`-Event aus, das kein Ladefehler ist.
 * `getAttribute` statt `el.src`: Der Getter liefert für '' die Dokument-URL.
 */
export function isReleasedMedia(el: Pick<HTMLMediaElement, 'getAttribute'>): boolean {
  return !el.getAttribute('src')
}
