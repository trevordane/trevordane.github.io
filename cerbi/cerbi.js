// Cerbi Demo (trevordane.github.io/cerbi/). Plays back a dataset from generator.js
// through an abstraction of the real system:
//
//   Pipeline  one invoice at a time moves through Received, Identify, Extract, Validate,
//             then is filed or held for a person
//   Review    held invoices with the one reason they stopped; approve, discard, or add an
//             unknown sender as a carrier
//   Rules     the checks that decide; switch one off or change a limit and every finished
//             invoice is re-routed
//   Document  a "scanned" invoice beside the fields read from it
//
// The Demo Builder underneath picks the scenario and seed, so any run can be shared as a
// link or exported as the JSON it was built from.
(() => {
  const root = document.getElementById("cerbi");
  const G = window.CerbiGen;
  if (!root || !G) return;

  // ---------- pacing: one invoice at a time, slow enough to follow ----------
  const T = { step: 1500, result: 2800 };                         // ms at Normal
  const SPEED = { slow: 1.7, normal: 1, fast: 0.5 };              // multiplies every wait
  const STAGES = ["Received", "Identify", "Extract", "Validate"];
  const HINTS = {
    pipeline: "Invoices arrive one at a time. Follow one through, then click any row to see how it was read.",
    review: "Everything that needs a person, with the one reason it stopped.",
    rules: "Switch a rule off or change a limit and watch finished invoices re-route.",
    document: "The page as it arrived, beside what the model read from it.",
  };

  const app = root.querySelector(".app");
  const panel = root.querySelector(".panel");
  const $ = (q) => root.querySelector(q);
  const money = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const pages = (v) => v.loads.length + " page" + (v.loads.length > 1 ? "s" : "");

  // ---------- state ----------
  let data, carriers, queue, cursor, invoices, current, run = 0;
  let tab = "pipeline", selected = null, note = "", paused = false, speed = "normal";
  let theme = "aviation-fuel", lists = null;   // lists: the visitor's own lists, or null for the theme's
  let onboarded = {};   // sender header -> name, added from Review during this session
  const held = () => invoices.filter((v) => v.outcome === "review" && !v.resolved);
  const finished = () => invoices.filter((v) => v.outcome);
  // The day so far: what came in before the demo opened, plus everything since
  const today = () => {
    const base = data.today || { received: 0, filed: 0, approved: 0 };
    return {
      received: base.received + invoices.length,
      filed: base.filed + invoices.filter((v) => v.outcome === "filed" || v.resolved === "approved").length,
      approved: base.approved + invoices.filter((v) => v.resolved === "approved").length,
    };
  };
  const byId = (id) => invoices.find((v) => v.id === id);
  const carrierName = (v) => v.carrierId ? carriers[v.carrierId].name : onboarded[v.header] || null;

  // ---------- the rules: the first enabled rule an invoice fails holds it ----------
  const RULES = [
    { id: "sender", q: "Sender is a known carrier", on: true,
      pass: (v) => !!carrierName(v),
      why: (v) => `"${v.header}" isn't a known carrier or alias.` },
    { id: "order", q: "Carrier has an open order", on: true,
      pass: (v) => !v.carrierId || !!v.orderNo,
      why: (v) => `${carrierName(v)} has no open order to bill against.` },
    { id: "dup", q: "Loads weren't already billed", on: true,
      pass: (v) => !firstRepeat(v),
      why: (v) => { const [bol, by] = firstRepeat(v); return `${bol} was already billed on ${by.id}${v.ref === by.ref ? ` (same carrier ref ${v.ref})` : ""}.`; } },
    { id: "readable", q: "Every load could be read", on: true,
      pass: (v) => v.loads.every((l) => l.readable),
      why: (v) => `Page ${v.loads.find((l) => !l.readable).page}: the ${data.theme.unit[1]} couldn't be read.` },
    { id: "total", q: "Total matches its loads", on: true, param: { label: "Allow a difference of up to", value: 1, step: 0.5, min: 0, max: 10, unit: "%" },
      pass: (v, p) => !v.loads.every((l) => l.readable) || Math.abs(v.total - v.sum) / v.sum * 100 <= p,
      why: (v) => `Total ${money(v.total)} is ${((v.total - v.sum) / v.sum * 100).toFixed(1)}% off its loads (${money(v.sum)}).` },
    { id: "hand", q: "Handwriting read confidently", on: true, param: { label: "Minimum confidence", value: 0.75, step: 0.05, min: 0.5, max: 0.95, unit: "" },
      pass: (v, p) => v.quality !== "handwritten" || v.confidence >= p,
      why: (v, p) => `Handwritten, read with ${v.confidence.toFixed(2)} confidence (minimum ${p.toFixed(2)}).` },
  ];
  // A load counts as billed once an earlier invoice carrying it got through, or is still waiting
  function firstRepeat(v) {
    for (const w of invoices) {
      if (w === v) break;
      if (!w.outcome || w.resolved === "discarded") continue;
      const hit = w.loads.find((l) => v.loads.some((m) => m.bol === l.bol));
      if (hit) return [hit.bol, w];
    }
    return null;
  }
  function route(v) {
    for (const r of RULES) {
      if (!r.on) continue;
      const p = r.param && r.param.value;
      if (!r.pass(v, p)) return { outcome: "review", rule: r.id, reason: r.why(v, p) };
    }
    return { outcome: "filed", rule: null, reason: "Passed every rule; filed and added to an import batch for a person to check." };
  }
  function reroute() {
    let moved = 0;
    for (const v of finished()) {
      if (v.resolved) continue;
      const r = route(v);
      if (r.outcome !== v.outcome) moved++;
      Object.assign(v, r);
    }
    return moved;
  }
  const status = (v) => !v.outcome ? ["info", "Processing"]
    : v.resolved === "approved" ? ["ok", "Approved"] : v.resolved === "discarded" ? ["mute", "Discarded"]
    : v.outcome === "filed" ? ["ok", "Filed"] : ["warn", "Needs review"];
  const chip = (v) => { const [c, t] = status(v); return `<span class="chip ${c}">${t}</span>`; };

  // ---------- building a demo from the generator ----------
  function build(scenario, seed) {
    run++;   // any timer from the previous run sees a stale run number and stops
    data = G.generate({ seed, scenario, theme, lists: lists || undefined });
    carriers = Object.fromEntries(data.world.carriers.map((c) => [c.id, c]));
    const fresh = (v) => Object.assign(JSON.parse(JSON.stringify(v)), { stage: 0, outcome: null, resolved: null });
    invoices = [];
    for (const v of data.invoices.filter((x) => x.phase === "history")) {
      const w = fresh(v); w.stage = STAGES.length; invoices.push(w); Object.assign(w, route(w));
    }
    queue = data.invoices.filter((x) => x.phase === "live").map(fresh);
    cursor = 0; current = null; selected = null; note = ""; onboarded = {};
    RULES.forEach((r) => { r.on = true; if (r.param) r.param.value = { total: 1, hand: 0.75 }[r.id]; });
    const url = new URL(location.href);
    url.searchParams.set("scenario", data.scenario); url.searchParams.set("seed", data.seed); url.searchParams.set("theme", data.theme.id);
    // Custom lists travel in the link too, so an edited demo still replays exactly
    url.hash = data.theme.custom ? "lists=" + encodeLists(data.theme.lists) : "";
    history.replaceState(null, "", url.hash ? url : url.href.replace(/#$/, ""));
    $("[data-theme]").value = data.theme.id;
    fillLists();
    $("[data-scenario]").value = data.scenario;
    $("[data-seed]").value = data.seed;
    $(".b-blurb").textContent = data.theme.blurbs[data.scenario] || G.SCENARIOS[data.scenario].blurb;
    render(true);
    later(next, 700);
  }

  // ---------- playback ----------
  function later(fn, ms) {
    const mine = run;
    const tick = () => { if (mine !== run) return; if (paused) return setTimeout(tick, 200); fn(); };
    setTimeout(tick, ms * SPEED[speed]);
  }
  function next() {
    if (cursor >= queue.length) return;   // the end of the generated stream
    current = queue[cursor++];
    invoices.push(current);
    if (invoices.length > 400) invoices.splice(0, invoices.length - 400);
    current.fresh = true;
    render();
    later(step, T.step);
  }
  function step() {
    const v = current;
    v.stage += 1;
    if (v.stage >= STAGES.length) {
      Object.assign(v, route(v));
      render();
      later(next, T.result);
    } else {
      render();
      later(step, T.step);
    }
  }
  // "Next invoice": finish the one in flight now, or start the next one straight away
  function skip() {
    run++;
    if (current && !current.outcome) {   // finish it and leave its result on screen
      current.stage = STAGES.length; Object.assign(current, route(current));
      render();
      later(next, T.result);
    } else next();
  }

  // ---------- views ----------
  function viewPipeline() {
    const v = current;
    const inStage = (i) => v && !v.outcome && v.stage === i ? 1 : 0;
    const t = today();
    const steps = STAGES.map((s, i) => `<li class="card${inStage(i) ? " on" : ""}"><div class="lbl">${s}</div><div class="n">${inStage(i)}</div></li>`).join("")
      + `<li class="card"><div class="lbl">Today</div><div class="done-split"><span><b class="n">${t.received.toLocaleString()}</b> in</span><span><b class="n ok">${t.filed.toLocaleString()}</b> filed</span><span><b class="n warn">${held().length}</b> to review</span></div></li>`;
    const DOING = [
      (v) => `Picked up from ${v.source === "email" ? "the shared mailbox" : v.source === "API" ? "the carrier's API" : "a drop folder"}: ${pages(v)}.`,
      (v) => `Matching "${esc(v.header)}" to a known carrier and an open order.`,
      (v) => `The model is reading ${pages(v)}${v.quality === "clean" ? "" : v.quality === "scan" ? " from a scan" : " of handwriting"}.`,
      () => `Checking it against the rules, top to bottom.`,
    ];
    let now = `<p class="empty">Waiting for the next invoice...</p>`;
    if (v) {
      const dots = STAGES.map((s, i) => `<span class="dot ${i < v.stage || v.outcome ? "done" : i === v.stage ? "now" : ""}"><span>${s}</span></span>`)
        .join('<span class="bar"></span>').replace(/<span class="bar"><\/span>(?=<span class="dot (done|now))/g, '<span class="bar done"></span>');
      const res = v.outcome ? `<div class="result ${v.outcome === "filed" ? "ok" : "warn"}">${chip(v)}<p>${esc(v.reason)}</p>
          <button class="linkish" data-open="${v.id}">See how it was read</button></div>` : `<p class="now-note">${DOING[v.stage](v)}</p>`;
      now = `<div class="now-top"><span class="mono muted">${v.id}</span><span class="who">${esc(v.header)}</span>
          <span class="chip q">${v.quality === "clean" ? "PDF" : v.quality === "scan" ? "Scan" : "Handwritten"}</span><span class="amt">${money(v.total)}</span></div>
        <div class="track" aria-hidden="true">${dots}</div>${res}`;
    }
    const rows = invoices.slice(-9).reverse().map((w) => {
      const fresh = w.fresh && w.outcome ? (w.fresh = false, " fresh") : "";
      return `<tr class="${fresh}" data-open="${w.outcome ? w.id : ""}" tabindex="${w.outcome ? 0 : -1}">
        <td class="mono">${w.id}</td><td>${esc(w.header)}</td><td class="r">${money(w.total)}</td><td>${chip(w)}</td>
        <td class="why">${w.outcome === "review" && !w.resolved ? esc(w.reason) : ""}</td></tr>`;
    }).join("");
    return `<ol class="steps" aria-label="Invoices at each stage">${steps}</ol>
      <div class="card now" aria-live="polite">${now}</div>
      <div class="card" style="margin-top:.9em;overflow:hidden"><table class="activity"><thead><tr><th>Invoice</th><th>Sender</th><th class="r">Total</th><th>Status</th><th class="why-h">Detail</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function loadsTable(v) {
    return `<div class="loads-wrap"><table class="loads"><thead><tr><th>Pg</th><th>BOL</th><th>${esc(data.theme.words.products)}</th><th>Lane</th><th class="r">${cap(data.theme.unit[1])}</th><th class="r">Amount</th></tr></thead><tbody>${
      v.loads.map((l) => `<tr><td>${l.page}</td><td class="mono">${l.bol}</td><td>${esc(l.product)}</td><td>${esc(l.from)} &rarr; ${esc(l.to)}</td>
        <td class="r ${l.readable ? "" : "bad"}">${l.readable ? l.qty.toLocaleString() : "unreadable"}</td><td class="r">${money(l.amount)}</td></tr>`).join("")
    }</tbody><tfoot><tr><td colspan="5">Invoice total</td><td class="r ${Math.abs(v.total - v.sum) > 0.01 ? "bad" : ""}">${money(v.total)}</td></tr></tfoot></table></div>`;
  }

  function viewReview() {
    const list = held().slice().reverse();
    if (!list.length) return `<p class="empty">Nothing needs a person right now.</p>`;
    let v = byId(selected);
    if (!v || v.outcome !== "review" || v.resolved) v = list[0];
    selected = v.id;
    const rule = RULES.find((r) => r.id === v.rule);
    const name = carrierName(v);
    return `<div class="split">
      <ol class="card inbox" aria-label="Held invoices">${list.map((h) => `
        <li><button class="${h.id === v.id ? "picked" : ""}" data-select="${h.id}">
          <span class="mono muted">${h.id}</span><span>${esc(h.header)}</span><span class="why">${esc(h.reason)}</span>
        </button></li>`).join("")}</ol>
      <article class="card detail" aria-label="${v.id}">
        <h2>${esc(name || v.header)} <span class="muted mono">${v.id}</span></h2>
        <p class="muted">Carrier ref ${esc(v.ref)} · ${v.date} · ${v.quality === "clean" ? "PDF" : v.quality === "scan" ? "scan" : "handwritten"} · via ${v.source}${v.orderNo ? " · " + v.orderNo : ""}</p>
        <p class="reason">${esc(v.reason)}</p>
        <p class="muted">Stopped by the rule "${rule.q}". <button class="linkish" data-tab="rules">Open Rules</button></p>
        ${loadsTable(v)}
        <div class="acts">
          <button class="btn pri" data-approve="${v.id}">Approve &amp; file</button>
          <button class="btn" data-discard="${v.id}">Discard</button>
          ${v.rule === "sender" ? `<button class="btn" data-onboard="${v.id}">Add as new carrier</button>` : ""}
          <button class="btn" data-open="${v.id}">Open document</button>
        </div>
        <p class="note" aria-live="polite">${esc(note)}</p>
      </article></div>`;
  }

  function viewRules() {
    const heldBy = (id) => held().filter((v) => v.rule === id).length;
    return `<div class="rules" role="group" aria-label="Rules, checked in order">
      ${RULES.map((r, i) => `<div class="card rule ${r.on ? "" : "off"}">
        <label class="switch"><input type="checkbox" data-rule="${r.id}" ${r.on ? "checked" : ""} aria-label="Rule ${i + 1}: ${r.q}"><span></span></label>
        <span class="q">${i + 1}. ${r.q}</span>
        <span class="held"><span class="chip ${heldBy(r.id) ? "warn" : "mute"}" data-held="${r.id}">${heldBy(r.id)} held</span></span>
        ${r.param ? `<label class="param">${r.param.label} <input type="number" data-param="${r.id}" value="${r.param.value}" step="${r.param.step}" min="${r.param.min}" max="${r.param.max}">${r.param.unit}</label>` : ""}
      </div>`).join("")}
      <p class="rule-end">Passes every rule in use &rarr; filed and batched for import</p>
      <p class="note" aria-live="polite">${esc(note)}</p></div>`;
  }

  // ---------- the document as it arrived ----------
  // Everything printed on the page that the generator doesn't hold (address, phone, stamp, fax
  // line, tilt) comes from a stream seeded by the run and the invoice, so a page always looks
  // the same and never moves the story.
  const BILL_TO = { "aviation-fuel": "Harborline Aviation Fuels", "cold-chain": "Greenway Fresh Distributors", "ltl": "Northfield Supply Co." };
  const STREETS = ["Industrial Pkwy", "Terminal Rd", "Commerce Dr", "Old Mill Rd", "Depot St", "Harbor Blvd", "Airport Rd", "Front St", "Rail Yard Ln", "Highway 17 S"];
  const TOWNS = [["Port Lennox", "NC"], ["Cedar Hollow", "SC"], ["Millbrook", "VA"], ["Bay Ridge", "GA"], ["Fairhaven", "NC"], ["Ashford", "SC"], ["Grant Creek", "VA"], ["Pine Landing", "FL"]];
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let selField = null;
  // One coffee-stained page per run: a scan or handwritten page early enough to be seen
  let ring = null;
  function ringPage() {
    const key = `${data.scenario}:${data.seed}`;
    if (!ring || ring.key !== key) {
      const messy = data.invoices.filter((w) => w.quality !== "clean");
      const early = messy.filter((w) => w.phase === "history");   // already there when the demo opens
      const pool = early.length ? early : messy.slice(0, 3);
      ring = { key, id: pool.length ? G.makeRng(`${key}:ring`).pick(pool).id : null };
    }
    return ring.id;
  }
  function paperOf(v) {
    const r = G.makeRng(`${data.seed}:${v.id}:paper`);
    const [y, m, d] = v.date.split("-");
    const town = r.pick(TOWNS);
    return {
      street: `${r.int(100, 9800)} ${r.pick(STREETS)}`,
      town: `${town[0]}, ${town[1]} ${r.int(27000, 31999)}`,
      phone: `(${r.pick(["252", "843", "757", "912", "910"])}) 555-01${String(r.int(0, 99)).padStart(2, "0")}`,
      date: `${m}/${d}/${y}`,
      handDate: `${Number(m)}/${Number(d)}/${y.slice(2)}`,
      stampDate: `${MONTHS[Number(m) - 1]} ${d} ${y}`,
      stamp: v.quality !== "clean" && r.chance(0.7),
      stampAt: [r.int(52, 70), r.int(68, 82), r.between(-14, 9).toFixed(1)],
      fax: v.quality === "scan" && v.source === "email" && r.chance(0.5)
        ? `${MONTHS[Number(m) - 1]}-${d}-${y} ${String(r.int(7, 16)).padStart(2, "0")}:${String(r.int(0, 59)).padStart(2, "0")}   FROM: ${r.pick(["252", "843", "757"])} 555 01${String(r.int(0, 99)).padStart(2, "0")}   P.001/00${v.loads.length > 1 ? 2 : 1}` : "",
      tilt: v.quality === "clean" ? 0 : r.between(-1.4, 1.4).toFixed(2),
      // Handling: creases, tri-fold lines from the envelope, now and then a coffee ring
      wrinkle: r.between(0.18, 0.42).toFixed(2), flip: r.chance(0.5), shift: `${r.int(0, 100)}% ${r.int(0, 100)}%`,
      folds: r.chance(0.55),
      ring: v.id === ringPage() ? { x: r.int(-10, 60), y: r.int(-8, 70), rot: r.int(0, 359), size: r.int(38, 62), alpha: r.between(0.45, 0.7).toFixed(2) } : null,
    };
  }
  function viewDocument() {
    const done = finished();
    if (!done.length) return `<p class="empty">Waiting for the first invoice...</p>`;
    let v = byId(selected);
    if (!v || !v.outcome) v = done[done.length - 1];
    if (v.id !== selected) selField = null;
    selected = v.id;
    const i = done.indexOf(v);
    const hand = v.quality === "handwritten";
    const P = paperOf(v);
    const u = data.theme.unit;
    const h = (s) => hand ? `<span class="hand">${s}</span>` : s;
    const hit = (key) => `data-field="${key}" tabindex="0" class="hit${selField === key ? " sel" : ""}"`;
    const c = (d) => Math.max(0.3, Math.min(0.99, v.confidence + d));   // no reading is ever certain
    const field = (key, label, value, conf, warn) =>
      `<li data-field="${key}" tabindex="0" role="button" aria-pressed="${selField === key}" class="hit${selField === key ? " sel" : ""}"><span class="k">${label}</span><span class="${warn ? "bad" : ""}">${value}</span>
        <span class="conf"><span class="meter"><i class="${conf < 0.75 ? "low" : ""}" style="width:${Math.round(conf * 100)}%"></i></span>${conf.toFixed(2)}</span></li>`;
    const name = carrierName(v);
    const blank = Math.max(0, 4 - v.loads.length);
    const paper = `<div class="sheet q-${v.quality}" style="--tilt:${P.tilt}deg" role="group" aria-label="Simulated ${v.quality === "clean" ? "PDF" : v.quality} invoice from ${esc(v.header)}">
        ${P.fax ? `<p class="p-fax">${P.fax}</p>` : ""}
        <div class="p-top">
          <div class="p-from"><b ${hit("sender")}>${esc(v.header)}</b><span>${P.street}</span><span>${P.town}</span><span>Tel ${P.phone}</span></div>
          <div class="p-title"><p class="p-doc">${hand ? "DELIVERY TICKET / INVOICE" : "INVOICE"}</p>
            <table class="p-box"><tr><th>Invoice No.</th><td ${hit("ref")}>${esc(v.ref)}</td></tr>
              <tr><th>Date</th><td ${hit("date")}>${hand ? h(P.handDate) : P.date}</td></tr>
              <tr><th>Terms</th><td>Net 30</td></tr><tr><th>PO No.</th><td>${v.orderNo ? h(esc(v.orderNo)) : "&nbsp;"}</td></tr></table></div>
        </div>
        <div class="p-bill"><span class="p-lbl">Bill to</span>${esc(BILL_TO[data.theme.id] || "Accounts Payable")}<br>Attn: Accounts Payable</div>
        <table class="p-lines"><thead><tr><th>BOL No.</th><th>${esc(cap(data.theme.words.products.split(" ")[0]))}</th><th>Origin</th><th>Destination</th><th class="r">${cap(u[0])}</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
          ${v.loads.map((l) => `<tr ${hit(`load-${l.page}`)}><td>${l.bol}</td><td>${h(esc(l.product))}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td>
            <td class="r">${l.readable ? h(l.qty.toLocaleString()) : `<span class="smudge"><span class="scrawl">${String(l.qty)[0]},~~0</span></span>`}</td><td class="r">$${l.rate.toFixed(4).replace(/0{1,2}$/, "")}</td><td class="r">${h(money(l.amount))}</td></tr>`).join("")}
          ${'<tr class="p-blank"><td colspan="7">&nbsp;</td></tr>'.repeat(blank)}
        </tbody><tfoot><tr ${hit("total")}><td colspan="6" class="r">TOTAL DUE</td><td class="r">${h(money(v.total))}</td></tr></tfoot></table>
        <p class="p-remit">Please remit to ${esc(v.header)}, ${P.street}, ${P.town}. Reference invoice number with payment. Thank you for your business.</p>
        ${v.quality !== "clean" ? `<div class="p-grunge${P.flip ? " flip" : ""}${P.folds ? " folds" : ""}" style="--wr:${P.wrinkle};--at:${P.shift}" aria-hidden="true"></div>` : ""}
        ${P.ring && v.quality !== "clean" ? `<div class="p-ring" style="left:${P.ring.x}%;top:${P.ring.y}%;width:${P.ring.size}%;--rot:${P.ring.rot}deg;opacity:${P.ring.alpha}" aria-hidden="true"></div>` : ""}
        ${P.stamp ? `<div class="p-stamp" style="left:${P.stampAt[0]}%;top:${P.stampAt[1]}%;--r:${P.stampAt[2]}deg">RECEIVED<span>${P.stampDate}</span></div>` : ""}
      </div>`;
    return `<div class="doc-nav"><button class="btn" data-step="-1" ${i ? "" : "disabled"}>&larr; Previous</button>
        <span class="mono">${v.id}</span> <span class="muted" data-of>${i + 1} of ${done.length}</span>
        <button class="btn" data-step="1" ${i < done.length - 1 ? "" : "disabled"}>Next &rarr;</button>
        <span class="muted doc-tip">Click a field, or a box on the page, to see where it was read.</span></div>
      <div class="doc">
        <figure class="paper">${paper}
          <figcaption>${v.quality === "clean" ? "PDF from the carrier" : v.quality === "scan" ? "Scanned page" : "Handwritten, scanned"} · via ${v.source}</figcaption>
        </figure>
        <div class="fields">
          <p>Read by the model</p>
          <ol>
            ${field("sender", "Sender", esc(v.header) + (name ? ` <span class="muted">= ${esc(name)}</span>` : ' <span class="bad">unknown</span>'), c(0.02), !name)}
            ${field("ref", "Invoice no.", esc(v.ref), c(0.03), false)}
            ${field("date", "Date", v.date, c(hand ? -0.05 : 0.01), false)}
            ${v.loads.map((l) => field(`load-${l.page}`, `Load ${l.page}`, l.readable ? `${esc(l.bol)} · ${esc(l.product)} · ${l.qty.toLocaleString()} ${u[0]} · ${money(l.amount)}` : `${esc(l.bol)} · ${u[1]} unreadable`, l.readable ? c(-0.02 * l.page) : 0.31, !l.readable)).join("")}
            ${field("total", "Total", money(v.total), c(hand ? -0.08 : 0), Math.abs(v.total - v.sum) > 0.01)}
          </ol>
          <div class="result ${v.outcome === "review" && !v.resolved ? "warn" : "ok"}">${chip(v)}<p>${esc(v.reason)}</p></div>
        </div>
      </div>`;
  }
  // Pick a field: its row in the list and its box on the page light up together. Picking it
  // again clears it.
  function selectField(key, from) {
    selField = selField === key ? null : key;
    for (const n of panel.querySelectorAll(".doc [data-field]")) {
      const on = n.dataset.field === selField;
      n.classList.toggle("sel", on);
      if (n.matches("li")) n.setAttribute("aria-pressed", String(on));
    }
    // Bring the other half into view: the page for a picked row, the row for a picked box
    const other = from && from.matches("li") ? ".sheet .sel" : ".fields .sel";
    panel.querySelector(other)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---------- drawing ----------
  const VIEWS = { pipeline: viewPipeline, review: viewReview, rules: viewRules, document: viewDocument };
  // render(true) redraws the open view. Plain render() is the live update while invoices move:
  // it only redraws the pipeline, and elsewhere just refreshes counts, so it never takes focus,
  // scroll or a half-typed number away from the visitor.
  function render(full = false) {
    for (const t of root.querySelectorAll("[role=tab]")) {
      const on = t.dataset.tab === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    }
    $("[data-tab=review] .count").textContent = held().length;
    $(".app-hint").textContent = HINTS[tab];
    $(".live").classList.toggle("paused", paused);
    $(".live span").textContent = paused ? "Paused" : cursor >= queue.length && current?.outcome ? "Stream finished" : "Live";
    $("[data-pause]").textContent = paused ? "Resume" : "Pause";
    const t = today();
    $(".b-stats").textContent = `Today: ${t.received.toLocaleString()} in · ${t.filed.toLocaleString()} filed · ${held().length} waiting · ${t.approved.toLocaleString()} approved by a person`;
    if (!full && tab !== "pipeline") {
      for (const n of panel.querySelectorAll("[data-held]")) {
        const k = held().filter((v) => v.rule === n.dataset.held).length;
        n.textContent = k + " held"; n.className = "chip " + (k ? "warn" : "mute");
      }
      const d = panel.querySelector("[data-of]");
      if (d) { const done = finished(); d.textContent = `${done.indexOf(byId(selected)) + 1} of ${done.length}`; panel.querySelector("[data-step='1']").disabled = done[done.length - 1]?.id === selected; }
      return;
    }
    const f = document.activeElement;
    const key = panel.contains(f) && [...f.attributes].find((a) => a.name.startsWith("data-") && a.value);
    const scroll = panel.querySelector(".inbox")?.scrollTop;
    panel.setAttribute("aria-labelledby", "tab-" + tab);
    panel.innerHTML = VIEWS[tab]();
    if (scroll) { const box = panel.querySelector(".inbox"); if (box) box.scrollTop = scroll; }
    if (key) (panel.querySelector(`[${key.name}="${CSS.escape(key.value)}"]:not(:disabled)`) || panel).focus({ preventScroll: true });
  }
  function go(t) {
    tab = t; note = "";
    render(true);
  }

  // ---------- input: the app ----------
  app.addEventListener("click", (e) => {
    const f = e.target.closest(".doc [data-field]");
    if (f) { selectField(f.dataset.field, f); return; }
    const b = e.target.closest("button, tr[data-open]");
    if (!b) return;
    const d = b.dataset;
    if (d.tab) go(d.tab);
    else if (d.open) { selected = d.open; go("document"); }
    else if (d.select) { selected = d.select; note = ""; render(true); }
    else if (d.approve || d.discard) {
      const v = byId(d.approve || d.discard);
      v.resolved = d.approve ? "approved" : "discarded";
      // A discarded duplicate's original still stands; an approved one now counts as billed
      reroute();
      note = `${v.id} ${v.resolved}.`;
      selected = null; render(true);
    }
    else if (d.onboard) {
      const v = byId(d.onboard);
      const name = v.header.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase());
      onboarded[v.header] = name;
      const moved = reroute();
      note = `Added ${name} as a carrier. ${moved} held invoice${moved === 1 ? "" : "s"} re-routed.`;
      render(true);
    }
    else if (d.step) {
      const done = finished(), n = done[done.indexOf(byId(selected)) + Number(d.step)];
      if (n) selected = n.id;
      selField = null;
      render(true);
    }
  });
  app.addEventListener("keydown", (e) => {
    const row = e.target.closest("tr[data-open]");
    if (row && row.dataset.open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); row.click(); }
    const f = e.target.closest(".doc [data-field]");
    if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectField(f.dataset.field, f); }
    // Tabs: arrow keys move along them
    if (e.target.getAttribute("role") === "tab" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const tabs = [...root.querySelectorAll("[role=tab]")];
      const n = tabs[(tabs.indexOf(e.target) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); go(n.dataset.tab); e.preventDefault();
    }
  });
  app.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.rule) RULES.find((r) => r.id === t.dataset.rule).on = t.checked;
    else if (t.dataset.param) {
      const r = RULES.find((x) => x.id === t.dataset.param), n = Number(t.value);
      if (t.value !== "" && Number.isFinite(n)) r.param.value = Math.min(r.param.max, Math.max(r.param.min, n));   // a cleared box keeps the old limit
    } else return;
    const moved = reroute();
    note = moved ? `Re-routed ${moved} finished invoice${moved === 1 ? "" : "s"}.` : "No finished invoice changes route.";
    const focusKey = t.dataset.rule ? `[data-rule="${t.dataset.rule}"]` : `[data-param="${t.dataset.param}"]`;
    render(true);
    panel.querySelector(focusKey)?.focus();
  });

  // ---------- input: the Demo Builder ----------
  const sel = $("[data-scenario]");
  sel.innerHTML = Object.entries(G.SCENARIOS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("");
  const randomSeed = () => String(1000 + Math.floor(Math.random() * 9000));
  const flash = (msg) => { const f = $(".b-flash"); f.textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(() => { f.textContent = ""; }, 2500); };
  sel.addEventListener("change", () => build(sel.value, $("[data-seed]").value || randomSeed()));
  const themeSel = $("[data-theme]");
  themeSel.innerHTML = Object.entries(G.THEMES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join("");
  themeSel.addEventListener("change", () => { theme = themeSel.value; lists = null; build(sel.value, data.seed); flash("Same seed, new names"); });

  // ---------- the lists: one textarea each, one item per line ----------
  // Carrier types are "Full name | short form" (the short form is how it gets written on paper)
  const LIST_KEYS = G.LISTS;
  const toText = (key, list) => list.map((x) => Array.isArray(x) ? x.join(" | ") : x).join("\n");
  const fromText = (key, text) => text.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => key === "types" ? l.split("|").map((p) => p.trim()).filter(Boolean) : l);
  function fillLists() {
    for (const key of LIST_KEYS) { const box = $(`[data-list="${key}"]`); if (box) box.value = toText(key, data.theme.lists[key]); }
    $(".lists-state").textContent = data.theme.custom ? "custom lists" : `the ${data.theme.label} lists`;
    // Each theme names its own lists: "Packing sheds & coolers", not "Pick-up points"
    for (const n of root.querySelectorAll("[data-word]")) n.textContent = data.theme.words[n.dataset.word];
  }
  function encodeLists(l) { return btoa(unescape(encodeURIComponent(JSON.stringify(l)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function decodeLists(s) {
    try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))); } catch { return null; }
  }
  $("[data-seed]").addEventListener("change", (e) => build(sel.value, e.target.value.trim() || randomSeed()));
  root.querySelector(".builder").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if ("regen" in d) { build(sel.value, randomSeed()); flash("New seed " + data.seed); }
    else if ("link" in d) {
      try { await navigator.clipboard.writeText(location.href); flash("Link copied"); }
      catch { prompt("Copy this link:", location.href); }
    }
    else if ("export" in d) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `cerbi-demo-${data.scenario}-${data.seed}.json` });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      flash(`Exported ${data.invoices.length} invoices`);
    }
    else if (d.speed) {
      speed = d.speed;
      root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }
    else if ("pause" in d) { paused = !paused; render(); }
    else if ("apply" in d) {
      const typed = Object.fromEntries(LIST_KEYS.map((key) => [key, fromText(key, $(`[data-list="${key}"]`).value)]));
      const base = G.THEMES[data.theme.id];
      const short = LIST_KEYS.filter((key) => typed[key].length < G.MIN[key]);
      // Only lists that differ from the theme count as custom, so an untouched form keeps a clean link
      const changed = LIST_KEYS.filter((key) => !short.includes(key) && JSON.stringify(typed[key]) !== JSON.stringify(base[key]));
      lists = changed.length ? Object.fromEntries(changed.map((key) => [key, typed[key]])) : null;
      build(sel.value, data.seed);
      const names = { first: "carrier names", types: "carrier types", products: "products", origins: "pick-up points", dests: "delivery points" };
      flash(short.length ? `Too short, kept the theme's: ${short.map((k) => `${names[k]} (at least ${G.MIN[k]})`).join(", ")}`
        : changed.length ? "Lists applied" : "No changes to apply");
    }
    else if ("resetLists" in d) { lists = null; build(sel.value, data.seed); flash("Back to the theme's lists"); }
    else if ("next" in d) skip();
  });

  // Keys: Space pauses, N sends the next invoice, B goes back to the board
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.matches("input, select, textarea")) return;
    const k = e.key.toLowerCase();
    if (k === " " && !e.defaultPrevented && !e.target.closest("button, tr, [data-field]")) { paused = !paused; render(); e.preventDefault(); }
    else if (k === "n") skip();
    else if (k === "b") location.href = "../";
  });

  // ---------- start: the scenario and seed from the link, or a fresh seed ----------
  const q = new URLSearchParams(location.search);
  if (G.THEMES[q.get("theme")]) theme = q.get("theme");
  const h = location.hash.match(/lists=([\w-]+)/);
  if (h) lists = decodeLists(h[1]);
  // With no scenario in the link, open on one whose key moment lands in the first minute
  build(G.SCENARIOS[q.get("scenario")] ? q.get("scenario") : "duplicate-storm", q.get("seed") || randomSeed());
})();
