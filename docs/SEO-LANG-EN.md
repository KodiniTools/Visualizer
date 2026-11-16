# Englisch serverseitig ausliefern (`?lang=en`)

Der Build schreibt neben `dist/index.html` (Deutsch, unverändert) drei englische
Varianten:

| URL                        | Datei           |
| -------------------------- | --------------- |
| `/visualizer/?lang=en`     | `index.en.html` |
| `/visualizer/app?lang=en`  | `app.en.html`   |
| `/visualizer/blog?lang=en` | `blog.en.html`  |

Sie haben schon im HTML `<html lang="en">`, englischen Titel und Description,
Open Graph/Twitter auf Englisch, Canonical `…?lang=en` sowie hreflang
`de` / `en` / `x-default`. Die Texte kommen aus `src/router/routeSeo.ts`, also
aus derselben Quelle wie im Browser (`applyRouteHead`). Fehlt in `index.html`
ein erwartetes Tag, bricht der Build ab, statt halb übersetztes HTML zu liefern.

## nginx

Geprüft gegen die echte Server-Konfiguration (`/etc/nginx/sites-enabled/kodinitools.com`):
`location ^~ /visualizer/` mit `alias /var/www/kodinitools.com/visualizer/;` und
`try_files $uri $uri/ /visualizer/index.html;`. Die Zeile unten funktioniert mit
`alias` unverändert (lokal mit nginx nachgestellt, inklusive SSI und `sub_filter`).

**1. Im `http`-Kontext**: ganz oben in `/etc/nginx/sites-enabled/kodinitools.com`,
vor dem ersten `server {` (nicht in einem `server`-Block):

```nginx
# ?lang=en → statische englische Variante; alles andere bleibt wie bisher.
# Regex (~) statt Klartext, weil nginx Klartext-Schlüssel ohne Groß-/Kleinschreibung
# vergleicht; ?lang=EN soll wie im Client Deutsch bleiben.
map "$uri:$arg_lang" $visualizer_lang_html {
    default                     "";
    "~^/visualizer/:en$"        /visualizer/index.en.html;
    "~^/visualizer/app:en$"     /visualizer/app.en.html;
    "~^/visualizer/blog:en$"    /visualizer/blog.en.html;
}
```

**2. Die eine Zeile im `location ^~ /visualizer/`**: `$visualizer_lang_html` vorn
in die bestehende `try_files`-Zeile setzen:

```nginx
try_files $visualizer_lang_html $uri $uri/ /visualizer/index.html;
```

Ohne `?lang=en` ist die Variable leer und nginx verhält sich wie vorher.
SSI (`ssi on`) gilt im selben `location` auch für die `.en.html`-Dateien.
Gibt es eigene Cache-Header für `index.html` (z. B. `location = /visualizer/index.html`),
dieselben für `~ ^/visualizer/[a-z]+\.en\.html$` setzen.

**3. Prüfen**

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -s 'https://kodinitools.com/visualizer/app?lang=en' | grep -E '<html lang|<title>|rel="canonical"'
curl -s 'https://kodinitools.com/visualizer/app' | grep -E '<html lang|<title>'
```

Erwartet: erste Ausgabe `lang="en"`, englischer Titel, Canonical `…/app?lang=en`;
zweite Ausgabe unverändert Deutsch.

Reihenfolge: erst deployen (damit die Dateien existieren), dann nginx neu laden.
Fehlen die Dateien, fällt `try_files` ohnehin auf `index.html` zurück.
