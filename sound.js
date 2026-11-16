// Background sound: a low hum and muffled hiss on a seamless loop, plus a short
// burst of static whenever the banner glitches (banner.js fires "banner:glitch").
// Off until the visitor turns it on with the footer switch or the S key; browsers
// don't allow sound before a click or key press anyway. The choice is remembered.
// All sounds are CC0; see assets/audio/LICENSES.txt.
(() => {
  const button = document.querySelector(".sound-toggle");
  if (!button || !(window.AudioContext || window.webkitAudioContext)) return;

  const AMBIENCE = "assets/audio/ambience.wav";
  const GLITCHES = ["assets/audio/glitch-1.wav", "assets/audio/glitch-2.wav", "assets/audio/glitch-3.wav"];
  const LEVEL = { ambience: 0.3, glitch: 0.14 };   // kept soft: a bed of sound, not a feature
  const SOFTEN_HZ = 2400;                            // low-pass over everything to round off the hiss
  const KEY = "tdr-sound";

  let ctx, master, ambienceGain, buffers, loading;
  let on = false;

  const remember = (value) => { try { localStorage.setItem(KEY, value ? "on" : "off"); } catch {} };
  const remembered = () => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };

  function label(state, pressed = state === "on") {
    button.setAttribute("aria-pressed", String(pressed));
    button.querySelector(".state").textContent = state;
  }

  // Built on the first turn-on, inside the click or key press that allows audio
  function setup() {
    if (loading) return loading;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.ratio.value = 8;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass"; soften.frequency.value = SOFTEN_HZ; soften.Q.value = 0.5;
    master = ctx.createGain();
    master.connect(soften).connect(limiter).connect(ctx.destination);
    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0;
    ambienceGain.connect(master);

    const load = (url) => fetch(url).then((r) => {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.arrayBuffer();
    }).then((data) => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail)));

    loading = Promise.all([load(AMBIENCE), ...GLITCHES.map(load)]).then(([ambience, ...glitches]) => {
      buffers = { ambience, glitches };
      const loop = ctx.createBufferSource();
      loop.buffer = ambience;
      loop.loop = true;                 // a decoded buffer loops with no gap
      loop.connect(ambienceGain);
      loop.start();
    });
    return loading;
  }

  // Browsers hold all sound until the visitor clicks, taps or presses a key. Until then a
  // remembered "on" waits, and says so, rather than showing "on" over silence.
  const tap = matchMedia("(pointer: coarse)").matches ? "tap" : "click";
  const start = (e) => {
    // The switch and the S key handle themselves: while waiting, they start the sound
    if ((e.target.closest && e.target.closest(".sound-toggle")) || e.key === "s" || e.key === "S") return;
    turnOn();
  };
  // pointerup, not pointerdown: on touch screens only the lift counts as an interaction
  const arm = () => { addEventListener("pointerup", start, true); addEventListener("keydown", start, true); };
  const disarm = () => { removeEventListener("pointerup", start, true); removeEventListener("keydown", start, true); };
  function hold() {
    on = false;
    label(`on, ${tap} to start`, true);
    arm();
  }

  async function turnOn() {
    disarm();
    on = true; label("on"); remember(true);
    try {
      await setup();
      if (!on) return;   // switched off again while the sounds were still loading
      // resume() can hang rather than fail when the browser still says no, so don't wait on it for long
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
      if (ctx.state !== "running") { if (on) hold(); return; }
      const now = ctx.currentTime;
      ambienceGain.gain.cancelScheduledValues(now);
      ambienceGain.gain.setTargetAtTime(LEVEL.ambience, now, 0.4);   // ease in
    } catch (err) {
      on = false; label("unavailable"); button.disabled = true;
      console.warn("Sound could not start:", err);
    }
  }

  function turnOff() {
    on = false; disarm();
    label("off"); remember(false);
    if (!ctx) return;
    const now = ctx.currentTime;
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setTargetAtTime(0, now, 0.12);
    setTimeout(() => { if (!on) ctx.suspend(); }, 600);
  }

  const toggle = () => (on ? turnOff() : turnOn());

  button.hidden = false;
  button.addEventListener("click", toggle);
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea")) return;
    if (e.key === "s" || e.key === "S") toggle();
  });

  // A short burst of radio static with each banner glitch, a little different each time
  addEventListener("banner:glitch", () => {
    if (!on || !buffers || ctx.state !== "running") return;
    const burst = ctx.createBufferSource();
    burst.buffer = buffers.glitches[(Math.random() * buffers.glitches.length) | 0];
    burst.playbackRate.value = 0.9 + Math.random() * 0.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(LEVEL.glitch, ctx.currentTime + 0.03);   // eases in, no snap
    burst.connect(gain).connect(master);
    burst.start();
  });

  // Quiet while the tab is in the background
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !on) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });

  // Remembered as on: start now if the browser allows sound before any interaction
  // (Firefox can say so up front), otherwise wait for the visitor's first click, tap or key
  if (remembered()) {
    if (navigator.getAutoplayPolicy && navigator.getAutoplayPolicy("audiocontext") === "allowed") turnOn();
    else hold();
  }
})();
