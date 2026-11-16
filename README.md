# Trevor Dane Respress — portfolio

Source of <https://trevordane.github.io/> (after the repo rename below). A
static site with no build step, no framework and no tracking. Fonts are
self-hosted.

| File | What it is |
|---|---|
| `index.html` | The site: a 1990s-style bulletin board. All content lives here. |
| `bbs.css` | The board's look: monospace grid, ASCII banner and menu, Blade Runner colours. |
| `bbs.js` | One board screen at a time: number keys or clicks, W for Writing, Q/Esc back to the menu, D for the simulation, R for the résumé. |
| `banner.js` | Banner animation: a random intro on each load (type, decode, scan, boot), then a shimmer every 5s with a glitch in its place every 3rd–5th time. `?intro=<name>` forces an intro for testing. |
| `sound.js` | Optional background sound (off until the visitor turns it on: footer switch or S key; remembered): a hum + hiss loop, and a static burst on each banner glitch. Browsers block sound until the first click, tap or key, so a remembered "on" reads "on, click to start" until then. |
| `cerbi/` | Interactive Cerbi simulation (fictional data), linked from [1] Work. Each tab has an About panel (copy in `ABOUT` in `cerbi.js`); pace is set by `STEP_MS` and `ARRIVE_MS` at the top of the same file. |
| `screen.css` | Monitor housing, frosted glass and parallax around the board. |
| `screen.js` | The parallax. |
| `fonts.css` | `@font-face` for every font, shared by the site and the résumé. |
| `site.js` | Footer year. |
| `resume.html` | Source of both résumé PDFs (BBS style). Edit this, not the PDFs. |
| `pdf/full/` | Résumé with Projects (Cerbi Demo, Writing). Linked from the site. |
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

## Publishing on GitHub Pages

1. **Rename the repo** to `trevordane.github.io` (Settings → General →
   Repository name). A repo with that exact name is served at the root URL.
2. **Default branch → `main`** (Settings → General → Default branch). The
   site lives on `main`; the old default branch holds the previous version.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   `.github/workflows/pages.yml` publishes the repo root on every push to
   `main`.
4. On a free plan Pages needs the repo to be public (Settings → General →
   Danger Zone → Change visibility). Nothing in it is private.
