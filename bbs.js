// The board: one screen at a time. Number keys pick a screen, W opens Writing, Q or Esc returns to the menu, D opens the simulation, R downloads the résumé.
// Each screen gets a history entry, so Back (or the phone's back gesture)
// returns to the menu. The page always opens at the top so the banner shows.
(() => {
  const screens = [...document.querySelectorAll(".screen")];
  const keys = { 1: "work", 2: "experience", 3: "toolkit", 4: "contact", w: "writing" };
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function show(id, { focus = false, push = false } = {}) {
    let target = screens.find((s) => s.id === id && !s.hidden);
    if (!target) target = document.getElementById("menu");
    for (const s of screens) s.classList.toggle("is-active", s === target);
    // No "Main menu" link while you're on the main menu
    document.querySelector('.foot [data-screen="menu"]').hidden = target.id === "menu";
    // The menu is the plain URL; writing "#menu" would also make Chrome start Tab
    // navigation from the menu, skipping the skip link
    const hash = target.id === "menu" ? "" : "#" + target.id;
    const url = location.pathname + location.search + hash;
    if (push && hash !== location.hash) history.pushState(null, "", url);
    else history.replaceState(null, "", url);
    scrollTo(0, 0);
    if (focus) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-screen]");
    if (!link) return;
    e.preventDefault();
    show(link.dataset.screen, { focus: true, push: true });
  });

  // Back/Forward, or a #screen typed into the address bar. The browser jumps to the
  // matching section after this runs, so return to the top on the next frame too.
  addEventListener("popstate", () => {
    show(location.hash.slice(1), { focus: true });
    requestAnimationFrame(() => scrollTo(0, 0));
  });

  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea")) return;
    const key = e.key.toLowerCase();
    if (keys[key]) show(keys[key], { focus: true, push: true });
    else if (key === "q" || key === "escape") show("menu", { focus: true, push: true });
    else if (key === "d") location.href = "cerbi/";
    else if (key === "r") document.getElementById("resume-link").click();
  });

  show(location.hash.slice(1));
  // An address with #work etc. still opens at the top: the browser's own jump to
  // the matching section would otherwise hide the banner and its animation
  addEventListener("load", () => requestAnimationFrame(() => scrollTo(0, 0)));
})();
