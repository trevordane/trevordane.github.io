# Trevor Dane Respress — portfolio

Source of <https://trevordane.github.io/>. A
static site with no build step, no framework and no tracking. Fonts are
self-hosted.

| File | What it is |
|---|---|
| `index.html` | The site: a 1990s-style bulletin board. All content lives here. |
| `bbs.css` | The board's look: monospace grid, ASCII banner and menu, Blade Runner colours. |
| `bbs.js` | One board screen at a time: number keys or clicks, N for Nexus, W for Writing, Q/Esc back to the menu, D for the simulation, R for the résumé. |
| `banner.js` | Banner animation: a random intro on each load (type, decode, scan, boot), then a shimmer every 5s with a glitch in its place every 3rd–5th time. `?intro=<name>` forces an intro for testing. |
| `sound.js` | Optional background sound (off until the visitor turns it on: footer switch or S key; remembered): a hum + hiss loop, and a static burst on each banner glitch. Browsers block sound until the first click, tap or key, so a remembered "on" reads "on, click to start" until then. |
| `cerbi/` | Interactive Cerbi demo (generated, fictional data), linked from [1] Work. `generator.js` builds each run from a scenario, theme and seed; `cerbi.js` plays it back (pace is `T` and `SPEED` at the top). |
| `docs/cerbi/` | Cerbi case study, design document, decision records and metrics. Built from Markdown by `build.py`. |
| `assets/paper/` | Paper textures for the demo's scanned pages (public domain; sources in its `LICENSES.txt`). |
| `screen.css` | Monitor housing and frosted glass around the board. |
| `fonts.css` | `@font-face` for every font, shared by the site and the résumé. |
| `site.js` | Footer year. |
| `resume.html` | Source of both résumé PDFs (BBS style). Edit this, not the PDFs. |
| `pdf/full/` | Résumé with Projects (Cerbi Demo, Writing, Nexus). Linked from the site. |
| `pdf/no-projects/` | Résumé with no Projects section. Not linked; for sending. |
| `tools/export-resume.js` | Regenerates both PDFs. |
| `fonts/` | IBM Plex Sans + Mono, Source Serif 4, Michroma, DSEG7 (all SIL OFL, see `LICENSES.txt`). |
| `assets/` | Images, and `assets/audio/` (CC0 sounds; sources in its `LICENSES.txt`). |

## Main menu

The ASCII banner and main menu are generated text. If you change a menu row,
keep every line of the box exactly 44 characters wide or the right edge breaks.

## Colours

**Site:** the Blade Runner palette (teal-black, cyan, amber), as tokens at
the top of `bbs.css`. The favicon and `theme-color` in `index.html` repeat
those colours, so update them too if the palette changes.

**Résumé:** the same BBS look as the site (ASCII banner, monospace, Blade Runner
colours), styled in `resume.html`. The banner is drawn as an image so résumé
parsers read the name from the real text line beneath it.

## Updating the résumé

Edit `resume.html`, then from the repo root:

```sh
node tools/export-resume.js
```

It writes both PDFs and refuses any that no longer fits on one Letter
page. `resume.html?projects=none` previews the no-projects variant in
the browser. Every variant is named `Trevor-Dane-Respress-Resume.pdf`
(one per folder under `pdf/`), so a copy carries the right name however it
is downloaded or forwarded. It needs Playwright with Chromium (`npm i -D playwright && npx playwright
install chromium`).

## Previewing

Serve the folder rather than opening the file directly; browsers block the
font preload on `file://` URLs.

```sh
python -m http.server 8000   # then http://localhost:8000/
```

## Publishing

GitHub Pages builds from GitHub Actions: `.github/workflows/pages.yml`
publishes the repo root on every push to `main`.
