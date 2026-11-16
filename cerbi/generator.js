// Cerbi demo data generator (trevordane.github.io/cerbi/).
//
// Pure and seeded: the same seed and scenario always build the same fictional world and
// the same invoice stream, so a demo can be shared as a link and replayed exactly.
// Nothing here touches the page; cerbi.js plays the stream back, and the same file runs
// in Node for tests and exports:
//
//   const gen = require("./generator.js");
//   gen.generate({ seed: "4417", scenario: "duplicate-storm" })
//
// Three ideas, borrowed from procedural level generation:
//   World first   carriers get names, aliases, rates, open orders and their own lanes
//                 before any invoice exists, so every invoice agrees with the world.
//   Knobs         a scenario is a handful of probabilities layered over a base mix.
//   Beats         a scenario can also pin key moments to the start of the live stream,
//                 so the story it is named for shows up in the first minute.
(function (global) {
  "use strict";

  // ---------- seeded randomness ----------
  // A string seed is hashed to 32 bits, then mulberry32 turns it into a stream of numbers.
  function hash(str) {
    let h = 2166136261;   // FNV-1a
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedText) {
    const next = mulberry32(hash(String(seedText)));
    const r = {
      next,
      between: (a, b) => a + next() * (b - a),
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),           // inclusive
      pick: (list) => list[Math.floor(next() * list.length)],
      chance: (p) => next() < p,
      // { clean: 4, scan: 3 } -> "clean" about 4 times in 7
      weighted(table) {
        const entries = Object.entries(table);
        let roll = next() * entries.reduce((t, [, w]) => t + w, 0);
        for (const [key, w] of entries) if ((roll -= w) < 0) return key;
        return entries[entries.length - 1][0];
      },
      shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      },
    };
    return r;
  }

  // ---------- themes: just lists ----------
  // Like the name bases in a fantasy map generator, a theme is nothing but lists and a few
  // numbers. Swap the lists and the same seed tells the same story with different names,
  // places and freight. Any list can be overridden: generate({ theme, lists: { origins: [...] } }).
  //   first    the first part of carrier names (also used for unknown senders)
  //   types    [full suffix, how it gets shortened on paper]
  //   products what gets hauled
  //   origins  where loads are picked up, as "Name | region | products"
  //   dests    where loads are delivered, as "Name | region | products"
  //   unit     what is counted on each load, short and long; qty and rate set the ranges
  //   words    labels for this theme's lists; blurbs override a scenario's description
  // Region and products are optional. Each carrier works one region, so its lanes stay
  // local; an origin with region "*" ships anywhere (a California grower, say). A place's
  // own products win over the theme's list: Lake Wales Citrus ships citrus.
  const THEMES = {
    "aviation-fuel": {
      label: "Aviation fuel",
      unit: ["gal", "gallons"], qty: [3000, 9000], step: 10, rate: [0.18, 0.24],
      words: { origins: "Fuel terminals & racks", dests: "Airfields & fuel docks", products: "Fuel grades" },
      first: [
        "Kestrel", "Ashgrove", "Little Pine", "Gullwing", "Brightwater", "Copperhead", "Marsh Hawk", "Ironwood",
        "Bluegill", "Saltmarsh", "Red Clay", "Tidewater", "Longleaf", "Osprey", "Cypress Run", "Heron Point",
        "Sandhill", "Blackwater", "Pelican Bay", "Sound Side", "Driftwood", "Shoal Creek", "Pamlico", "Croatan",
        "Neuse Point", "Live Oak", "Seabreeze", "Pocosin", "Turnstone", "Wren Hollow", "Cedar Island",
        "Falcon Ridge", "Sparrow Field", "Harrier", "Swift Creek", "Kingfisher", "Bald Cypress", "Merlin", "Sea Oat",
        "Black Rail", "Tern Island", "Cormorant", "White Oak", "Gannet"
      ],
      types: [
        ["Haul Co.", "Haul"], ["Tankers", "TNK"], ["Freight", "Frt"], ["Transport", "Trans"], ["Haulage", "Hlg"],
        ["Carriers", "Carr."], ["Logistics", "Log."], ["Fuel Lines", "Fuel"], ["Petroleum Transport", "Petro"],
        ["Bulk Haulers", "Bulk"], ["Tank Lines", "Tank Ln"], ["Fuel Delivery", "Fuel Del."],
        ["Energy Transport", "Energy Trans"], ["Tank Truck Co.", "TT Co"], ["Fuel Haulers", "Fuel Hlrs"],
        ["Liquid Carriers", "Liq. Carr."], ["Aero Fuels Transport", "Aero Fuels"], ["Bulk Transport", "Bulk Trans"]
      ],
      products: [
        "Jet A", "Jet A-1", "Avgas 100LL", "Diesel #2", "Mogas", "SAF blend"
      ],
      origins: [
        "Terminal A | Harbor", "Terminal B | Inland", "North Depot | Inland", "South Rack | Harbor",
        "River Terminal | River", "Harbor Rack | Harbor", "East Rack | Harbor", "Port Terminal | Harbor",
        "Pipeline Station 4 | Inland", "Inland Depot | Inland", "West Rack | Inland", "Barge Dock 2 | River",
        "Refinery Gate 3 | Harbor", "Tank Farm North | Inland", "Tank Farm South | River", "Rail Transload | Inland",
        "Bay Terminal | Harbor", "Junction Depot | River"
      ],
      dests: [
        "Airfield 2 | Inland", "Airfield 5 | River", "Marina Fuel Dock | Harbor | Diesel #2, Mogas",
        "County Airport | Inland", "Regional Airport | River", "Seaplane Base | Harbor | Avgas 100LL, Mogas",
        "Municipal Airport | Inland", "Executive Airport | River", "Heliport 3 | Harbor | Jet A",
        "Flight School Ramp | Inland | Avgas 100LL", "Crop-Duster Strip | River | Avgas 100LL, Jet A",
        "Charter Terminal | Harbor", "Airfield 9 | River", "Island Airstrip | Harbor | Avgas 100LL",
        "FBO North Ramp | Inland", "FBO South Ramp | River", "Hangar Row C | Inland",
        "Medevac Helipad | Harbor | Jet A", "Air Cargo Apron | River | Jet A, Jet A-1",
        "Glider Field | Inland | Avgas 100LL", "Lakeside Floatplane Dock | River | Avgas 100LL, Mogas",
        "Corporate Hangar 12 | Harbor | Jet A, SAF blend"
      ],
    },
    "cold-chain": {
      label: "Cold-chain produce",
      unit: ["plt", "pallets"], qty: [6, 26], step: 1, rate: [85, 140],
      words: { origins: "Packing sheds & coolers", dests: "Grocery DCs & markets", products: "Produce" },
      blurbs: {
        "handwriting-day": "Handwritten field tickets from the packing sheds all day. Change the confidence limit in Rules and watch invoices re-route.",
        "monday-backlog": "The weekend's harvest paperwork lands at once: a long history, lots of scans and a full review inbox.",
      },
      first: [
        "Frostline", "Coldwater", "Evergreen", "Glacier Point", "Harvest Moon", "Orchard Run", "Blue Ridge",
        "Valley Fresh", "Crisp Air", "Northwind", "Silver Creek", "Sunfield", "Clearbrook", "Highland", "Meadowlark",
        "Pinecrest", "Dewdrop", "Bluebonnet", "Sweetwater", "Cold Spring", "Windmill", "Copper Canyon", "Fairfield",
        "Green Acres", "Riverbank", "Sundance", "Tall Pines", "Willow Creek", "Bramble", "Juniper", "Cascade",
        "Larkspur", "Mistral", "Snowcap", "Thistle", "Orchardview", "Bellwether", "Prairie Rose", "Honeybee",
        "Sage Hill", "Icehouse"
      ],
      types: [
        ["Reefer Lines", "Reefer"], ["Cold Freight", "Cold Frt"], ["Refrigerated", "Refrig."],
        ["Produce Express", "Prod. Exp"], ["Temp Logistics", "Temp Log"], ["Cold Carriers", "CC"],
        ["Cold Storage Transport", "CST"], ["Fresh Lines", "Fresh"], ["Chill Express", "Chill Exp"],
        ["Reefer Systems", "Reefer Sys"], ["Perishables Transport", "Perish."], ["Frozen Freight", "Frz Frt"],
        ["Farm Haulers", "Farm Hlrs"], ["Coldline", "Cold Ln"], ["Harvest Logistics", "Harvest Log"],
        ["Cool Cargo", "Cool Cgo"]
      ],
      products: [
        "Strawberries", "Romaine", "Sweet potatoes", "Blueberries", "Apples", "Citrus", "Cucumbers", "Peaches",
        "Leafy greens", "Watermelon", "Onions", "Pears"
      ],
      origins: [
        "Salinas Packing Shed | * | Romaine, Leafy greens, Strawberries", "Yakima Cold Storage | * | Apples, Pears",
        "Immokalee Farms | Georgia & Florida | Cucumbers, Watermelon",
        "Vidalia Packhouse | Georgia & Florida | Onions", "Plant City Cooler | Georgia & Florida | Strawberries",
        "Watsonville Ranch | * | Strawberries, Leafy greens", "Fresno Fruit Co-op | * | Peaches, Citrus",
        "Lodi Vineyard Dock | * | Pears, Cucumbers",
        "Homestead Growers | Georgia & Florida | Leafy greens, Cucumbers",
        "Nogales Cross-dock | * | Cucumbers, Watermelon", "Hendersonville Orchards | Carolinas | Apples",
        "Toppenish Cold Store | * | Apples, Pears", "Faison Produce Barn | Carolinas | Cucumbers, Sweet potatoes",
        "Mount Olive Pickle Dock | Carolinas | Cucumbers", "Clinton Sweet Potato Co-op | Carolinas | Sweet potatoes",
        "Belle Glade Packing | Georgia & Florida | Leafy greens", "Lake Wales Citrus | Georgia & Florida | Citrus",
        "Hood River Fruit Store | * | Pears, Apples", "Wenatchee Apple Shed | * | Apples",
        "Yuma Lettuce Cooler | * | Romaine, Leafy greens"
      ],
      dests: [
        "Atlanta DC 14 | Georgia & Florida", "Charlotte DC 7 | Carolinas", "Raleigh Grocery DC | Carolinas",
        "Richmond Cross-dock | Tennessee & Virginia", "Columbia DC 3 | Carolinas",
        "Jacksonville DC 9 | Georgia & Florida", "Nashville DC 11 | Tennessee & Virginia",
        "Greenville DC 5 | Carolinas", "Norfolk Grocery DC | Tennessee & Virginia",
        "Savannah Cold Dock | Georgia & Florida", "Birmingham DC 2 | Georgia & Florida",
        "Knoxville DC 6 | Tennessee & Virginia", "Durham Co-op Market | Carolinas",
        "Wilmington Seafood Market | Carolinas", "Myrtle Beach Restaurant Supply | Carolinas",
        "Chattanooga DC 8 | Tennessee & Virginia", "Louisville DC 4 | Tennessee & Virginia",
        "Orlando DC 12 | Georgia & Florida", "Roanoke Grocery DC | Tennessee & Virginia",
        "Fayetteville Commissary | Carolinas", "Asheville Farmers Market | Carolinas",
        "Memphis Cold Hub | Tennessee & Virginia"
      ],
    },
    "ltl": {
      label: "LTL freight",
      unit: ["lb", "pounds"], qty: [400, 9000], step: 10, rate: [0.12, 0.32],
      words: { origins: "Origin terminals & docks", dests: "Delivery towns", products: "Freight" },
      blurbs: {
        "handwriting-day": "Handwritten delivery receipts all day. Change the confidence limit in Rules and watch invoices re-route.",
      },
      first: [
        "Granite", "Ironside", "Summit", "Keystone", "Patriot", "Liberty", "Redline", "Crossroads", "Heartland",
        "Lakeshore", "Piedmont", "Coastal", "Timberline", "Riverbend", "Bluestone", "Fairway", "Old Mill",
        "Cardinal", "Pinnacle", "Ridgeway", "Steelhead", "Valley", "Anchor", "Beacon", "Blue Line", "Cobblestone",
        "Eastgate", "Frontier", "Gateway", "Harbor Point", "Iron Horse", "Junction", "Mainstay", "Northstar",
        "Overland", "Pioneer", "Ranger", "Southbound", "Tri-County", "Westward", "Wiregrass"
      ],
      types: [
        ["Freight Lines", "Frt Lines"], ["Express", "Exp"], ["LTL", "LTL"], ["Motor Freight", "Mtr Frt"],
        ["Transport", "Trans"], ["Cartage", "Cart."], ["Distribution", "Dist."], ["Truck Lines", "Trk Lines"],
        ["Delivery", "Dlvy"], ["Freightways", "Frtwys"], ["Transfer", "Xfer"], ["Moving & Storage", "M&S"],
        ["Haul & Go", "H&G"], ["Logistics", "Log."], ["Shipping", "Shpg"], ["Courier", "Cour."]
      ],
      products: [
        "Building supplies", "Appliances", "Auto parts", "Paper goods", "Electronics", "Textiles", "Hardware",
        "Flooring", "Tires", "Furniture", "Pool supplies", "Restaurant equipment"
      ],
      origins: [
        "Greensboro Terminal | Piedmont", "Charlotte Hub | Piedmont", "Raleigh Cross-dock | Eastern NC",
        "Norfolk Terminal | Virginia", "Columbia Hub | SC & Georgia", "Knoxville Terminal | Mountains",
        "Wilson Terminal | Eastern NC", "Fayetteville Hub | Eastern NC",
        "Spartanburg Dock | SC & Georgia | Auto parts, Tires", "Durham Terminal | Piedmont",
        "Hickory Furniture Dock | Mountains | Furniture", "High Point Warehouse | Piedmont | Furniture, Textiles",
        "Rocky Mount Cross-dock | Eastern NC", "Florence Hub | SC & Georgia", "Richmond Terminal | Virginia",
        "Lumberton Dock | Eastern NC", "Burlington Hub | Piedmont | Textiles", "Kernersville Terminal | Piedmont"
      ],
      dests: [
        "Wilmington, NC | Eastern NC", "New Bern, NC | Eastern NC", "Florence, SC | SC & Georgia",
        "Roanoke, VA | Virginia", "Asheville, NC | Mountains", "Augusta, GA | SC & Georgia",
        "Kinston, NC | Eastern NC", "Goldsboro, NC | Eastern NC", "Myrtle Beach, SC | SC & Georgia",
        "Lynchburg, VA | Virginia", "Greenville, NC | Eastern NC", "Rocky Mount, NC | Eastern NC",
        "Charleston, SC | SC & Georgia", "Danville, VA | Virginia", "Elizabeth City, NC | Eastern NC",
        "Morehead City, NC | Eastern NC", "Jacksonville, NC | Eastern NC", "Boone, NC | Mountains",
        "Hilton Head, SC | SC & Georgia", "Sumter, SC | SC & Georgia", "Blacksburg, VA | Virginia",
        "Suffolk, VA | Virginia", "Bristol, TN | Mountains", "Athens, GA | SC & Georgia",
        "Winston-Salem, NC | Piedmont", "Salisbury, NC | Piedmont", "Statesville, NC | Piedmont"
      ],
    },
  };
  const LISTS = ["first", "types", "products", "origins", "dests"];   // the parts a visitor can edit
  // A theme with any lists swapped in; lists that are too short to build a world are ignored
  const MIN = { first: 6, types: 1, products: 1, origins: 2, dests: 2 };
  // "Lake Wales Citrus | Georgia & Florida | Citrus" -> { name, region, products }
  function parsePlace(line) {
    const [name, region = "", products = ""] = String(line).split("|").map((x) => x.trim());
    return { name, region, products: products ? products.split(",").map((x) => x.trim()).filter(Boolean) : [] };
  }
  function resolveTheme(id, lists = {}) {
    const base = THEMES[id] || THEMES["aviation-fuel"];
    const t = Object.assign({ id: THEMES[id] ? id : "aviation-fuel" }, base);
    for (const key of LISTS) {
      const list = (lists[key] || []).filter((x) => (Array.isArray(x) ? x[0] : x));
      if (list.length >= MIN[key]) { t[key] = list; t.custom = true; }
    }
    return t;
  }

  const SOURCES = { email: 6, API: 3, "drop folder": 1 };

  // ---------- scenarios ----------
  // knobs override BASE; beats pin an event to a position in the live stream (0 = first live invoice)
  const BASE = {
    carriers: 5,                 // carriers in the world
    noOrder: 1,                  // how many of them have no open order (their invoices hold)
    strangers: 3,                // different unknown senders that can turn up
    history: 6,                  // invoices already processed when the demo opens
    stream: 120,                 // invoices waiting to arrive, live
    unknown: 0.05,               // chance an invoice is from a sender Cerbi has never seen
    duplicate: 0.03,             // chance an invoice re-bills loads that were already billed
    mismatch: 0.06,              // chance the printed total disagrees with its loads
    quality: { clean: 4, scan: 3, handwritten: 1 },
  };
  const SCENARIOS = {
    "ordinary-day": {
      label: "Ordinary day",
      blurb: "A normal mix. Most invoices file on their own; about one in five needs a person.",
      knobs: {},
      beats: [],
    },
    "monday-backlog": {
      label: "Monday backlog",
      blurb: "The weekend's paperwork lands at once: a long history, lots of scans and a full review inbox.",
      knobs: { history: 30, quality: { clean: 2, scan: 5, handwritten: 2 }, mismatch: 0.08 },
      today: [300, 420],          // documents already in by the time the demo opens
      beats: [{ at: 0, kind: "unreadable" }],
    },
    "duplicate-storm": {
      label: "Duplicate storm",
      blurb: "One carrier resends last week's invoices. The duplicate check catches each one before it is paid twice.",
      knobs: { history: 16, duplicate: 0.25, dupFrom: "busiest" },
      beats: [{ at: 0, kind: "duplicate" }, { at: 2, kind: "duplicate" }],
    },
    "handwriting-day": {
      label: "Handwriting day",
      blurb: "Handwritten driver tickets all day. Change the confidence limit in Rules and watch invoices re-route.",
      knobs: { quality: { clean: 1, scan: 2, handwritten: 5 } },
      beats: [{ at: 0, kind: "handwritten" }],
    },
  };

  // ---------- helpers ----------
  const cents = (n) => Math.round(n * 100) / 100;
  const pad = (n, w) => String(n).padStart(w, "0");
  // Business days from Monday 5 Oct 2026, as yyyy-mm-dd
  function businessDate(index) {
    const d = new Date(Date.UTC(2026, 9, 5));
    let left = index;
    while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6 !== 0) left--; }
    return d.toISOString().slice(0, 10);
  }

  // ---------- the world: carriers before invoices ----------
  // Two random streams: `rng` rolls the story (rates, weights, orders), `words` picks from the
  // theme's lists. Shuffling a list uses one roll per item, so keeping words apart means a
  // theme with longer or shorter lists still tells exactly the same story.
  function buildWorld(rng, words, k, T) {
    const origins = T.origins.map(parsePlace), dests = T.dests.map(parsePlace);
    // Only regions a carrier can actually work: something to pick up there (or from "*") and
    // somewhere to deliver. With no usable regions, carriers run any lane.
    const regions = [...new Set(dests.map((d) => d.region).filter(Boolean))]
      .filter((r) => origins.some((o) => o.region === r || o.region === "*"));
    const firsts = words.shuffle(T.first);
    const carriers = Array.from({ length: Math.min(k.carriers, T.first.length - 1) }, (_, i) => {
      const first = firsts[i];
      const [suffix, short = suffix] = words.pick(T.types);
      const name = `${first} ${suffix}`;
      // How the name shows up on paper: shouted, shortened, or initialled
      const forms = [
        name.toUpperCase().replace(/\./g, ""),
        `${first} ${short}`,
        first.includes(" ") ? `${first[0]}. ${first.split(" ")[1]} ${short}` : `${first.toUpperCase()} ${short.toUpperCase()}`,
      ];
      const aliases = [...new Set(words.shuffle(forms).slice(0, words.int(1, 2)))];
      const prefix = first.replace(/[^A-Z]/g, "").slice(0, 2) + suffix[0];   // e.g. "KH" for Kestrel Haul Co.
      // A home region keeps the lanes local; "*" origins (far-off growers) can ship to any region
      const region = regions.length ? words.pick(regions) : "";
      const from = origins.filter((o) => !region || o.region === region || o.region === "*");
      const to = dests.filter((d) => !region || d.region === region);
      return {
        id: "c" + (i + 1), name, aliases,
        rate: cents(rng.between(T.rate[0], T.rate[1])),                     // $ per unit
        weight: rng.int(1, 5),                                               // how often they send
        orders: Array.from({ length: rng.int(1, 3) }, () => "PO-" + rng.int(40000, 49999)),
        region,
        origins: words.shuffle(from).slice(0, 2).map((o) => o.name),
        dests: words.shuffle(to).slice(0, words.int(2, 3)).map((d) => d.name),
        products: words.shuffle(T.products).slice(0, words.int(2, 3)),
        refPrefix: prefix, nextRef: rng.int(20000, 29000),
      };
    });
    // The quietest carriers are the ones without an open order, so the holds stay occasional
    carriers.slice().sort((a, b) => a.weight - b.weight).slice(0, k.noOrder).forEach((c) => { c.orders = []; });
    const used = new Set(carriers.map((c) => c.name.split(" ")[0]));
    const strangers = words.shuffle(T.first.filter((f) => !used.has(f.split(" ")[0])))
      .slice(0, k.strangers).map((f) => { const [full, short = full] = words.pick(T.types); return `${f.toUpperCase()} ${short.toUpperCase()}`; });
    // Products a place is known for, by name, so a load from Lake Wales is citrus
    const placeProducts = Object.fromEntries([...origins, ...dests].filter((p) => p.products.length).map((p) => [p.name, p.products]));
    return { carriers, strangers, placeProducts, origins: origins.map((o) => o.name), dests: dests.map((d) => d.name) };
  }

  // ---------- one invoice ----------
  function makeInvoice(rng, k, world, state, forced, live, T) {
    const prior = state.invoices;
    // A duplicate re-sends loads that were already billed, with the carrier's same reference.
    // A scenario's duplicate rate applies to the live stream; history keeps the base rate.
    if (forced === "duplicate" || (!forced && rng.chance(live ? k.duplicate : BASE.duplicate))) {
      const from = k.dupFrom === "busiest" ? world.carriers.slice().sort((a, b) => b.weight - a.weight)[0].id : null;
      const pool = prior.filter((v) => v.carrierId && !v.dupOf && !state.resent.has(v.id) && (!from || v.carrierId === from));
      if (pool.length) {
        const orig = rng.pick(pool);
        state.resent.add(orig.id);   // each invoice is resent at most once
        return Object.assign(JSON.parse(JSON.stringify(orig)), {
          id: "INV-" + state.nextNo++, date: businessDate(state.day), dupOf: orig.id,
          quality: rng.weighted(k.quality), source: rng.weighted(SOURCES), beat: forced || null,
        }, confidenceFor(rng, orig.quality));
      }
    }
    const unknown = forced === "unknown" || (!forced && rng.chance(k.unknown));
    let carrier = null;
    if (!unknown) {
      const pool = forced === "noOrder" ? world.carriers.filter((c) => !c.orders.length) : world.carriers;
      carrier = pool[Math.floor(rng.next() * pool.length)];
      if (!forced) carrier = world.carriers[Number(rng.weighted(Object.fromEntries(world.carriers.map((c, i) => [i, c.weight]))))];
    }
    const quality = forced === "handwritten" ? "handwritten" : forced === "unreadable" ? rng.pick(["scan", "handwritten"]) : rng.weighted(k.quality);
    const rate = carrier ? carrier.rate : cents(rng.between(T.rate[0], T.rate[1]));
    const loads = Array.from({ length: rng.int(1, 3) }, (_, i) => {
      const qty = Math.round(rng.between(T.qty[0], T.qty[1]) / T.step) * T.step;
      state.bol += rng.int(3, 40);
      const from = rng.pick(carrier ? carrier.origins : world.origins), to = rng.pick(carrier ? carrier.dests : world.dests);
      // What's on the load: what the pick-up point is known for, else what the delivery point
      // takes, else what this carrier hauls. Picked from the word stream, like every name.
      const product = state.words.pick(world.placeProducts[from] || world.placeProducts[to] || (carrier ? carrier.products : T.products));
      return {
        page: i + 1, bol: "BOL-" + state.bol, from, to, product,
        qty, rate, amount: cents(qty * rate),
        readable: !(quality === "handwritten" ? rng.chance(0.12) : quality === "scan" ? rng.chance(0.03) : false),
      };
    });
    if (forced === "unreadable") loads[loads.length - 1].readable = false;
    const sum = cents(loads.reduce((t, l) => t + l.amount, 0));
    const off = forced === "mismatch" || (!forced && rng.chance(k.mismatch));
    const total = off ? cents(sum * rng.between(1.025, 1.08)) : sum;
    const header = carrier ? (rng.chance(0.35) ? rng.pick(carrier.aliases) : carrier.name) : rng.pick(world.strangers);
    const ref = carrier ? `${carrier.refPrefix}-${carrier.nextRef++}` : "No. " + rng.int(100, 999);
    return Object.assign({
      id: "INV-" + state.nextNo++, ref, carrierId: carrier ? carrier.id : null, header,
      orderNo: carrier && carrier.orders.length ? rng.pick(carrier.orders) : null,
      quality, source: rng.weighted(SOURCES), date: businessDate(state.day),
      loads, sum, total, dupOf: null, beat: forced || null,
    }, confidenceFor(rng, quality));
  }
  // How sure the model is reading the page: clean PDFs high, handwriting all over the place
  function confidenceFor(rng, quality) {
    const c = quality === "clean" ? rng.between(0.96, 0.985) : quality === "scan" ? rng.between(0.86, 0.95) : rng.between(0.62, 0.95);
    return { quality, confidence: Math.round(c * 1000) / 1000 };
  }

  // ---------- the whole dataset ----------
  function generate({ seed = "1", scenario = "ordinary-day", theme = "aviation-fuel", lists } = {}) {
    const sc = SCENARIOS[scenario] || SCENARIOS["ordinary-day"];
    const name = SCENARIOS[scenario] ? scenario : "ordinary-day";
    const k = Object.assign({}, BASE, sc.knobs);
    const rng = makeRng(`${name}:${seed}`);
    // The theme only changes the words, not the dice: the same seed keeps the same story
    const T = resolveTheme(theme, lists);
    const words = makeRng(`${name}:${seed}:words`);
    const world = buildWorld(rng, words, k, T);
    const state = { invoices: [], nextNo: 1041, bol: rng.int(10000, 20000), day: 0, resent: new Set(), words };
    const beats = new Map((sc.beats || []).map((b) => [b.at, b.kind]));
    for (let i = 0; i < k.history + k.stream; i++) {
      if (i && rng.chance(0.25)) state.day++;   // a few invoices a day, in date order
      const live = i - k.history;
      const v = makeInvoice(rng, k, world, state, live >= 0 ? beats.get(live) : undefined, live >= 0, T);
      v.phase = live < 0 ? "history" : "live";
      state.invoices.push(v);
    }
    // The day so far: what came in before the demo opened, so the counters read like a real
    // morning (a weekday runs about 380 documents). Its own stream, so it never moves the story.
    const day = makeRng(`${name}:${seed}:day`);
    const [lo, hi] = sc.today || [140, 240];
    const received = day.int(lo, hi);
    const today = {
      received,
      filed: Math.round(received * day.between(0.78, 0.84)),
      approved: Math.round(received * day.between(0.07, 0.1)),
    };
    // nextRef was only a counter for building; it is not part of the world
    world.carriers.forEach((c) => { delete c.nextRef; });
    const themeOut = { id: T.id, label: T.label, custom: !!T.custom, unit: T.unit, words: T.words, blurbs: T.blurbs || {}, lists: Object.fromEntries(LISTS.map((key) => [key, T[key]])) };
    return { generator: "cerbi-demo", version: 3, seed: String(seed), scenario: name, label: sc.label, theme: themeOut, world, today, invoices: state.invoices };
  }

  const api = { generate, SCENARIOS, THEMES, LISTS, BASE, MIN, makeRng };
  if (typeof module === "object" && module.exports) module.exports = api;
  else global.CerbiGen = api;
})(typeof window !== "undefined" ? window : globalThis);
