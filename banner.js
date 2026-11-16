// Banner animation.
// On load: one intro picked at random (type, decode, scan or boot).
// Then every 5 seconds: a shimmer, except that every 3rd to 5th time (re-rolled
// after each one) a glitch plays instead.
// Off for prefers-reduced-motion. The banner is aria-hidden, so screen readers
// are unaffected; the name they read is the sr-only <h1>.
(() => {
  const banner = document.querySelector(".banner");
  if (!banner || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const INTERVAL = 5000;
  const GLITCH_EVERY = [3, 5];   // a glitch replaces the shimmer every 3rd to 5th time

  // The banner as a grid of characters: name rows (cyan) then surname rows (amber)
  const original = banner.innerHTML;
  const sur = banner.querySelector(".sur");
  const nameRows = banner.firstChild.textContent.replace(/\n$/, "").split("\n");
  const surRows = sur.textContent.split("\n");
  const rows = [...nameRows, ...surRows];
  const width = Math.max(...rows.map((r) => r.length));
  const esc = (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);
  const NOISE = "/\\|_-=+<>*#:.";
  const noise = () => NOISE[(Math.random() * NOISE.length) | 0];
  const between = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));

  // Draw every cell through cell(row, col, realChar) -> { ch, cls } or nothing
  function draw(cell) {
    const line = (r) => [...rows[r].padEnd(width)].map((c, x) => {
      const { ch = c, cls } = cell(r, x, c) || {};
      return cls ? `<span class="${cls}">${esc(ch)}</span>` : esc(ch);
    }).join("").replace(/\s+$/, "");
    const top = nameRows.map((_, r) => line(r)).join("\n");
    const bottom = surRows.map((_, i) => line(nameRows.length + i)).join("\n");
    banner.innerHTML = `${top}\n<span class="sur">${bottom}</span>`;
  }

  // Run frame(t) with t going 0 -> 1 over ms, then put the real banner back
  const play = (ms, frame) => new Promise((done) => {
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else { banner.innerHTML = original; done(); }
    })(t0);
  });

  const order = [];   // reading order of cells, for typing
  rows.forEach((row, r) => { for (let x = 0; x < row.length; x++) order.push(r * 1000 + x); });
  const rank = new Map(order.map((key, i) => [key, i]));

  const intros = {
    // A modem painting the banner row by row, with a block cursor
    type: () => play(1900, (t) => {
      const k = Math.floor(t * order.length);
      draw((r, x) => {
        const i = rank.get(r * 1000 + x);
        if (i === undefined || i > k) return { ch: " " };
        if (i === k) return { ch: " ", cls: "cur" };
      });
    }),
    // Every stroke starts as noise and locks into place, roughly left to right
    decode: () => {
      const settle = rows.map((row) => [...row].map((_, x) => 0.1 + 0.6 * (x / width) + Math.random() * 0.25));
      return play(1700, (t) => draw((r, x, c) => {
        if (c === " ") return;
        const s = settle[r][x];
        if (t < s) return { ch: noise() };
        if (t < s + 0.06) return { cls: "hi" };
      }));
    },
    // Rows drawn top to bottom by a bright scanline
    scan: () => play(1300, (t) => {
      const head = t * (rows.length + 1);
      draw((r) => {
        if (r > head) return { ch: " " };
        if (r > head - 1) return { cls: "hi" };
      });
    }),
    // Old monitor powering on: a bright line opens into the picture, with a flicker
    boot: () => new Promise((done) => {
      banner.classList.add("booting");
      banner.addEventListener("animationend", () => { banner.classList.remove("booting"); done(); }, { once: true });
    }),
  };

  const idles = {
    // A diagonal glint sweeps across the letters
    shimmer: () => play(1300, (t) => {
      const p = -12 + t * (width + rows.length * 2 + 24);
      draw((r, x, c) => {
        if (c === " ") return;
        const d = x + r * 2 - p;
        if (d > -5 && d < 0) return { cls: "hi" };
      });
    }),
    // Signal interference: a couple of rows slip sideways and break up for a moment
    glitch: () => {
      const hit = new Set([...Array(between([1, 3]))].map(() => (Math.random() * rows.length) | 0));
      const shift = Object.fromEntries([...hit].map((r) => [r, (Math.random() < 0.5 ? -1 : 1) * between([1, 3])]));
      return play(170, () => draw((r, x) => {
        if (!hit.has(r)) return;
        const src = rows[r][x - shift[r]] || " ";
        if (src !== " " && Math.random() < 0.25) return { ch: noise(), cls: "hi" };
        return { ch: src };
      }));
    },
  };

  // Which effect ran last, for testing: <html data-banner="…">
  const mark = (name) => { document.documentElement.dataset.banner = name; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    // ?intro=<name> forces an intro, for testing; otherwise one at random
    const names = Object.keys(intros);
    const forced = new URLSearchParams(location.search).get("intro");
    const intro = names.includes(forced) ? forced : names[(Math.random() * names.length) | 0];
    mark(intro);
    await intros[intro]();

    // Effects start every INTERVAL ms, measured start to start
    let untilGlitch = between(GLITCH_EVERY);
    let next = performance.now() + INTERVAL;
    for (;;) {
      await wait(next - performance.now());
      // Back from a background tab (timers and frames pause there): carry on from now
      // rather than playing every missed effect back to back
      next = Math.max(next, performance.now()) + INTERVAL;
      untilGlitch -= 1;
      const effect = untilGlitch === 0 ? "glitch" : "shimmer";
      if (effect === "glitch") untilGlitch = between(GLITCH_EVERY);
      mark(effect);
      if (effect === "glitch") dispatchEvent(new Event("banner:glitch"));   // sound.js plays a burst
      await idles[effect]();
    }
  })();
})();
