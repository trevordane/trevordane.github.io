# Cerbi: portfolio documents

Documents about Cerbi, the AI document automation platform I built at Titan
Aviation Fuels. Carrier, customer, coworker and internal system names are
left out; the architecture, decisions and numbers are real. The source code
is in a private repository.

| Document | What it is |
|---|---|
| [case-study.md](case-study.md) | One page: problem, what I built, results, decisions |
| [design.md](design.md) | The design document: architecture, data model, reliability, testing |
| [cost-and-metrics.md](cost-and-metrics.md) | October 2026 volume, outcomes, holds, quality, engineering metrics |
| [decisions/](decisions/) | Seven architecture decision records (0002 was withdrawn) |
| [architecture.svg](architecture.svg) | The pipeline, with today's counts |
| [metrics.py](metrics.py) | The calculation behind every number; `python docs/cerbi/metrics.py` rewrites [metrics.json](metrics.json) |

Each Markdown document also has an HTML version in the site's bulletin-board
style, served by GitHub Pages under `/docs/cerbi/` (start at
[index.html](index.html)). They are linked from the main site's [W] Writing screen.

**To refresh the numbers:** run Cerbi's analytics export, copy the new
aggregates into `metrics.py` (never the raw export: it names internal
systems and carries BOL and load numbers), run it, update the figures in
the Markdown to match `metrics.json`, then run `python docs/cerbi/build.py`
to regenerate the HTML pages and charts.
