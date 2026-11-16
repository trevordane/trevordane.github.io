# How I built the Cerbi demo generator

**Author:** Trevor Dane Respress · **Try it:** [Cerbi Demo](../../cerbi/) ·
**Code:** [generator.js](../../cerbi/generator.js) (about 420 lines, no
dependencies)

---

### The problem

Cerbi reads real carrier paperwork, so I can't show it to anyone outside
the company. Screenshots go stale, and blurred-out data makes a demo look
fake. I needed a demo that runs the real interface on data that is
invented but believable, tells a story that lands in the first minute,
and comes out the same every time it's shown.

A hand-made sample file would have gone out of date with the first
product change. So I built a generator instead: one seed in, one complete
demo out.

### The approach

**1. Build the world first, then the documents.** A seed first creates
the carriers: their names, how those names get shortened or shouted on
paper ("KESTREL HAUL CO", "Kestrel Haul"), their rates, their open orders,
the one region each works and the lanes and products they run. Only then
are invoices generated, and each one is drawn from that world. That is
what makes the data believable: the same carrier always bills the same
lanes at its own rate, and an invoice that holds for "no open order"
belongs to a carrier that really has none.

**2. Scenarios are a few settings, not scripts.** A scenario is a handful
of probabilities over a base mix: how many scans or handwritten pages, how
often an unknown sender turns up, how often a duplicate or a bad total
appears. "Ordinary day", "Monday backlog", "Duplicate storm" and
"Handwriting day" are each about five lines of settings.

**3. Beats pin the key moment to the start.** Chance alone might not show
a duplicate for ten minutes, and nobody watches a demo that long. So a
scenario can pin an event to a position in the stream: "Duplicate storm"
puts a duplicate first and another third, so the duplicate check fires
within the first minute.

**4. Themes are plain lists.** Carrier names, carrier types, products, and
pick-up and delivery points are lists, like the name lists behind a
fantasy map generator. Aviation fuel, cold-chain produce and LTL freight
are three sets of lists, and visitors can edit them in the page. A place
can name its region and its products, so cold produce doesn't come out of
a fuel terminal and every carrier stays inside a region it can actually
serve.

**5. Two random streams keep the story fixed.** Names and list picks come
from their own random stream, separate from the one that decides what
happens. Switching the theme, or editing a list, changes every name and
place but keeps the same events in the same order. One scenario can be
shown to a fuel distributor and a produce shipper and tell the same story.

**6. Same seed, same demo.** The seed, scenario, theme and any edited lists
all go into the link, so "Copy link" hands someone exactly this run.
"Export JSON" gives the whole dataset: the world and every invoice.

### What I'd change at scale

- **Checks on the data itself:** tests that every generated invoice agrees
  with its world (lane, rate, product, region) across thousands of seeds.
- **A themes file per vertical,** owned by the people who sell to it, so a
  new market is a list edit and not a code change.
- **Release readiness:** each new product feature adds the event that
  shows it off as a beat, so the demo shows it on the day it ships.

### Applying it to another product

The same pattern fits any system with linked records. For a recruiting
product, the world would be a company: departments, open jobs with real
stages, hiring managers and interviewers with calendars. Candidates come
next, drawn from that world, so every application belongs to a real job
and moves through that job's stages. Scenarios would be settings like
"busy hiring week" or "one role with a flood of applicants", with a beat
to make sure the interesting moment, such as an offer being approved,
happens early. Themes would be lists of job titles, locations and
languages for each industry or market.
