// Fake parallax: the glass and the screen behind it drift apart as the
// pointer moves (or the phone tilts), so they read as two layers.
// Writes --px / --py (each -1..1) on <html>; screen.css turns them into motion.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, frame = 0;

  // Ease toward the target (12% of the gap per frame) so the layers glide
  function tick() {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    root.style.setProperty("--px", x.toFixed(4));
    root.style.setProperty("--py", y.toFixed(4));
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
  }
  function aim(nx, ny) {
    tx = Math.max(-1, Math.min(1, nx));
    ty = Math.max(-1, Math.min(1, ny));
    if (!frame) frame = requestAnimationFrame(tick);
  }

  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") aim((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
  root.addEventListener("mouseleave", () => aim(0, 0));

  // Phones: tilt. Android allows this outright; iOS needs a tap-to-allow prompt, so it is skipped there.
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null || e.beta == null) return;
    aim(e.gamma / 25, (e.beta - 45) / 25);   // 45° is roughly how a phone is held
  }, { passive: true });
})();
