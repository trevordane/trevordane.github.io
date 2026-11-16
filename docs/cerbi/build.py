"""Build the HTML pages in docs/cerbi/ from the Markdown beside them.

The Markdown is the source; the HTML is generated and committed, so the
site keeps having no build step on GitHub Pages. Standard library only.

    python docs/cerbi/build.py

Handles the Markdown these documents use: headings, paragraphs, bullet and
numbered lists, tables, links, images, bold, italic, inline code, code
blocks and horizontal rules. The metrics page also gets two charts drawn from
metrics.json.
"""

import html
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent

PAGES = [
    # (source, output, title, short name)
    ("index", "index.html", "Cerbi documents", "Index"),
    ("case-study.md", "case-study.html", "Case study", "Case study"),
    ("design.md", "design.html", "Design document", "Design"),
    ("cost-and-metrics.md", "cost-and-metrics.html", "Metrics", "Metrics"),
    ("demo-generator.md", "demo-generator.html", "How I built the demo generator", "Demo generator"),
    ("decisions/README.md", "decisions/index.html", "Decision records", "Decisions"),
]

INDEX_MD = """# Cerbi: documents

Cerbi is the AI document automation platform I built at Titan Aviation
Fuels. It reads scanned and handwritten freight paperwork, files what is
complete and holds the rest for a person with a short reason. These pages
are the portfolio versions of its documents: carrier, customer, coworker
and internal system names are left out; the architecture, decisions and
numbers are real.

| October 2026 | |
|---|---:|
| Documents received | **9,064** |
| Loads filed | **96.5%** (51.9% with no person touching them) |
| Duplicate invoices closed before payment | **61 loads** |

| Read | What it is |
|---|---|
| [Case study](case-study.md) | One page: problem, what I built, results, decisions |
| [Design document](design.md) | Architecture, data model, reliability, testing |
| [Metrics](cost-and-metrics.md) | October 2026: volume, outcomes, holds, quality |
| [Decision records](decisions/) | Seven short architecture decision records |
| [Demo generator](demo-generator.md) | How the seeded demo-data generator behind the simulation works |
| [Simulation](../../cerbi/) | Try an interactive simulation with fictional data |

![Cerbi architecture](architecture.svg)

Source for these pages: [Markdown on GitHub](https://github.com/trevordane/trevordane.github.io/tree/main/docs/cerbi).
"""

LOGO = r"""  _____ ____ ___   ___   ____
 / ___// __// _ \ / _ ) /  _/
/ /__ / _/ / , _// _  |_/ /
\___//___//_/|_|/____//___/"""

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} (Cerbi) · Trevor Dane Respress</title>
  <meta name="description" content="{desc}">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#04080a">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='6' fill='%2304080a'/%3E%3Crect x='10' y='14' width='22' height='5' fill='%23ffae42'/%3E%3Crect x='10' y='16' width='44' height='1' fill='%2322404a'/%3E%3Ctext x='32' y='50' font-family='Arial,sans-serif' font-size='20' font-weight='700' fill='%23ebe5d8' text-anchor='middle'%3ETDR%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="{root}fonts.css">
  <link rel="stylesheet" href="{root}screen.css">
  <link rel="stylesheet" href="{root}bbs.css">
  <style>
    .doc-head {{ display: flex; flex-wrap: wrap; align-items: flex-end; gap: .4em 3ch; }}
    .logo {{ color: var(--cyan); line-height: 1.12; }}
    .back {{ margin-left: auto; text-decoration: none; }} .back .k, .docnav .k {{ color: var(--amber); }}
    .docnav {{ display: flex; flex-wrap: wrap; gap: .2em 2.5ch; margin: 1.1em 0 0; padding-bottom: .5em; border-bottom: 1px solid var(--line); }}
    .docnav a {{ text-decoration: none; }}
    .docnav a[aria-current] {{ color: var(--on-light); background: var(--cyan); padding: 0 .6ch; }}
    .docnav a[aria-current] .k {{ color: var(--on-light); }}
    .prose {{ max-width: 92ch; padding: 1.2em 0 2em; }}
    .prose > * + * {{ margin-top: .9em; }}
    .prose h1 {{ color: var(--cyan); font-size: 1.25em; }}
    .prose h1::before {{ content: "== "; color: var(--box); }}
    .prose h2 {{ color: var(--amber); margin-top: 1.8em; }}
    .prose h2::before {{ content: "-- "; color: var(--box); }}
    .prose h3 {{ color: var(--cyan); margin-top: 1.4em; }}
    .prose p, .prose li {{ color: var(--ink); }}
    .prose em {{ color: var(--dim); }}
    .prose ul li {{ padding-left: 2.5ch; text-indent: -2.5ch; }}
    .prose ul li::before {{ content: "*  "; color: var(--amber); }}
    .prose ol {{ counter-reset: n; }}
    .prose ol li {{ counter-increment: n; padding-left: 4ch; text-indent: -4ch; }}
    .prose ol li::before {{ content: counter(n, decimal-leading-zero) "  "; color: var(--amber); }}
    .prose li + li {{ margin-top: .35em; }}
    .prose code {{ color: var(--cyan); }}
    .prose pre {{ background: var(--raise); border: 1px solid var(--line); padding: .7em 1.5ch; overflow-x: auto; }}
    .prose hr {{ border: 0; border-top: 1px dashed var(--line); }}
    .prose .tablewrap {{ overflow-x: auto; }}
    .prose table {{ border-collapse: collapse; font-size: .93em; min-width: 60%; }}
    .prose th {{ color: var(--dim); font-weight: 400; text-align: left; border-bottom: 1px solid var(--box); }}
    .prose td, .prose th {{ padding: .25em 1.2ch; vertical-align: top; }}
    .prose td {{ border-bottom: 1px dotted var(--line); }}
    .prose .r {{ text-align: right; white-space: nowrap; }}
    @media (max-width: 700px) {{ .prose .r {{ white-space: normal; }} .prose table {{ width: 100%; }} }}
    .prose strong {{ color: var(--amber); font-weight: 500; }}
    .prose td strong {{ color: var(--cyan); }}
    .prose img, .prose svg.chart {{ display: block; max-width: 100%; height: auto; border: 1px solid var(--line); }}
    .prose figure figcaption {{ color: var(--dim); font-size: .9em; margin-top: .4em; }}
    .gen {{ color: var(--dim); font-size: .85em; border-top: 1px solid var(--line); padding-top: .6em; }}
  </style>
</head>
<body>
  <main id="main">
    <div class="bbs">
      <header class="doc-head">
        <pre class="logo" aria-hidden="true">{logo}</pre>
        <p class="sr-only">Cerbi</p>
        <a class="back" href="{root}"><span class="k">[B]</span> Back to the board</a>
      </header>
      <nav class="docnav" aria-label="Cerbi documents">{nav}</nav>
      <article class="prose">
{body}
      </article>
      <p class="gen">Generated from <a href="{src_href}">{src_name}</a> by build.py. Figures as of {asof}.</p>
    </div>
  </main>
  <script src="{root}screen.js"></script>
</body>
</html>
"""


# ------------------------------------------------------------------ markdown

def rewrite_href(href: str) -> str:
    """Point Markdown links at the generated pages."""
    if re.match(r"^[a-z]+:", href) or href.startswith("#"):
        return href
    path, _, frag = href.partition("#")
    if path.endswith("README.md"):
        path = path[: -len("README.md")] + "index.html"
    elif path.endswith(".md"):
        path = path[:-3] + ".html"
    elif path.endswith("/") and path not in ("../../", "../../../") and not path.endswith("cerbi/"):
        path = path + "index.html"
    return path + ("#" + frag if frag else "")


def inline(text: str) -> str:
    """Escape, then apply inline Markdown: code, images, links, bold, italic."""
    codes = []

    def keep_code(m):
        codes.append("<code>" + html.escape(m.group(1)) + "</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", keep_code, text)
    text = text.replace("\\*", "\x01")  # an escaped asterisk is literal
    text = html.escape(text, quote=False)
    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)",
                  lambda m: f'<img src="{m.group(2)}" alt="{m.group(1)}" loading="lazy">', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                  lambda m: f'<a href="{html.escape(rewrite_href(m.group(2)))}">{m.group(1)}</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)
    text = text.replace("\x01", "*")
    return text


def slug(text: str) -> str:
    s = re.sub(r"<[^>]+>", "", text).lower()
    s = re.sub(r"[^\w\- ]", "", s)
    return s.strip().replace(" ", "-")


def table(lines):
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines]
    head, align, body = rows[0], rows[1], rows[2:]
    right = [a.endswith(":") and not a.startswith(":") for a in align]
    out = ['<div class="tablewrap"><table>']
    if any(h for h in head):
        out.append("<thead><tr>" + "".join(
            f'<th{" class=r" if right[i] else ""}>{inline(h)}</th>' for i, h in enumerate(head)) + "</tr></thead>")
    out.append("<tbody>")
    for r in body:
        out.append("<tr>" + "".join(
            f'<td{" class=r" if i < len(right) and right[i] else ""}>{inline(c)}</td>' for i, c in enumerate(r)) + "</tr>")
    out.append("</tbody></table></div>")
    return "\n".join(out)


def markdown(md: str, charts=None) -> str:
    lines = md.splitlines()
    out, i = [], 0
    charts = charts or {}
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            out.append("<pre><code>" + html.escape("\n".join(lines[i + 1:j])) + "</code></pre>")
            i = j + 1
            continue
        m = re.match(r"^(#{1,3}) (.*)$", line)
        if m:
            n, txt = len(m.group(1)), inline(m.group(2))
            out.append(f'<h{n} id="{slug(m.group(2))}">{txt}</h{n}>')
            key = slug(m.group(2))
            if key in charts:
                out.append(charts[key])
            i += 1
            continue
        if re.match(r"^-{3,}$", line.strip()):
            out.append("<hr>")
            i += 1
            continue
        if line.lstrip().startswith("|"):
            j = i
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                j += 1
            out.append(table(lines[i:j]))
            i = j
            continue
        m = re.match(r"^(\s*)([-*]|\d+\.) (.*)$", line)
        if m:
            ordered = m.group(2)[0].isdigit()
            items, j = [], i
            while j < len(lines):
                mm = re.match(r"^(\s*)([-*]|\d+\.) (.*)$", lines[j])
                if mm and len(mm.group(1)) == 0:
                    items.append(mm.group(3))
                elif lines[j].startswith("  ") and items and lines[j].strip():
                    items[-1] += " " + lines[j].strip()
                else:
                    break
                j += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(t)}</li>" for t in items) + f"</{tag}>")
            i = j
            continue
        para = [line.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{1,3} |\||```|\s*([-*]|\d+\.) |-{3,}$)", lines[i]):
            para.append(lines[i].strip())
            i += 1
        text = " ".join(para)
        if re.fullmatch(r"!\[[^\]]*\]\([^)]+\)", text):
            m2 = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", text)
            out.append(f'<figure><img src="{m2.group(2)}" alt="{html.escape(m2.group(1))}" loading="lazy"></figure>')
        else:
            # two trailing spaces or a hard line in the source header block
            out.append("<p>" + inline(text) + "</p>")
    return "\n".join(out)


# ------------------------------------------------------------------ charts

INK, DIM, LINE, CYAN, AMBER, BOX = "#e6e1d4", "#93aaa6", "#24434c", "#5ff2e8", "#ffae42", "#6b8b8f"
FONT = "font-family=\"'Plex Mono', ui-monospace, Menlo, Consolas, monospace\""


def _svg_open(w, h, tid, title, heading):
    return [f'<svg class="chart" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{tid}" {FONT}>',
            f'<title id="{tid}">{html.escape(title)}</title>',
            f'<rect width="{w}" height="{h}" fill="#061012"/>',
            f'<text x="20" y="26" fill="{DIM}" font-size="13">{html.escape(heading)}</text>']


def _legend(svg, items, x0, y, colw=300):
    for k, (label, col) in enumerate(items):
        lx, ly = x0 + (k % 2) * colw, y + (k // 2) * 24
        svg.append(f'<rect x="{lx}" y="{ly - 11}" width="12" height="12" fill="{col}"/>')
        svg.append(f'<text x="{lx + 20}" y="{ly}" fill="{INK}" font-size="13">{html.escape(label)}</text>')


def chart_outcome(m) -> str:
    o = m["outcome"]
    parts = [("Filed, untouched", o["filed_untouched"], o["filed_untouched_pct"], CYAN),
             ("Filed after a hold", o["filed_with_help"], o["filed_with_help_pct"], "#2a9d96"),
             ("Purgatory", o["purgatory"], o["purgatory_pct"], AMBER),
             ("Limbo", o["limbo"], o["limbo_pct"], BOX),
             ("Rejected", o["rejected"], o["rejected_pct"], LINE)]
    w, x0, bw = 640, 20, 600
    title = f"{o['loads']:,} loads by status: " + ", ".join(f"{n.lower()} {p}%" for n, _, p, _ in parts)
    svg = _svg_open(w, 196, "c1t", title, f"{o['loads']:,} loads by status, {m['as_of']}")
    x = x0
    for name, n, pct, col in parts:
        width = bw * n / o["loads"]
        svg.append(f'<rect x="{x:.1f}" y="40" width="{max(width - 1, 1):.1f}" height="34" fill="{col}"/>')
        x += width
    _legend(svg, [(f"{n} {v:,} · {p}%", c) for n, v, p, c in parts], x0, 104)
    svg.append("</svg>")
    return "\n".join(svg)


def _bars(svg, pts, x0, x1, base, top, mx, ticks, fmt, highlight_last=True):
    for v in ticks:
        y = base - (base - top) * v / mx
        svg.append(f'<line x1="{x0}" x2="{x1}" y1="{y:.1f}" y2="{y:.1f}" stroke="{LINE}" stroke-width="1"/>')
        svg.append(f'<text x="{x0 - 8}" y="{y + 4:.1f}" fill="{DIM}" font-size="12" text-anchor="end">{fmt(v)}</text>')
    step = (x1 - x0) / len(pts)
    for k, (lab, v, shown) in enumerate(pts):
        bx, bwid = x0 + step * k + step * 0.18, step * 0.64
        y = base - (base - top) * v / mx
        col = AMBER if highlight_last and k == len(pts) - 1 else BOX
        svg.append(f'<rect x="{bx:.1f}" y="{y:.1f}" width="{bwid:.1f}" height="{max(base - y, 1):.1f}" fill="{col}"/>')
        svg.append(f'<text x="{bx + bwid / 2:.1f}" y="{y - 8:.1f}" fill="{INK}" font-size="13" text-anchor="middle">{shown}</text>')
        svg.append(f'<text x="{bx + bwid / 2:.1f}" y="{base + 18}" fill="{DIM}" font-size="12" text-anchor="middle">{lab}</text>')


def chart_holds(m) -> str:
    h = m["holds"]
    cols = {"Cleared by Cerbi": CYAN, "Replaced by a re-read": "#2a9d96", "Cleared by a person": AMBER,
            "Still open": BOX, "Discarded": LINE}
    parts = [(k, v["n"], v["pct"], cols[k]) for k, v in h["outcomes"].items()]
    w, x0, bw = 640, 20, 600
    title = f"How {h['total']:,} holds ended: " + ", ".join(f"{n.lower()} {p}%" for n, _, p, _ in parts)
    svg = _svg_open(w, 220, "c2t", title, f"How {h['total']:,} holds ended, {m['as_of']}")
    x = x0
    for name, n, pct, col in parts:
        width = bw * n / h["total"]
        svg.append(f'<rect x="{x:.1f}" y="40" width="{max(width - 1, 1):.1f}" height="34" fill="{col}"/>')
        x += width
    _legend(svg, [(f"{n} {v:,} · {p}%", c) for n, v, p, c in parts], x0, 104)
    svg.append("</svg>")
    return "\n".join(svg)


# ------------------------------------------------------------------ pages

def nav(current_out: str, active: str) -> str:
    here = (HERE / current_out).parent
    items = []
    for k, (_, out, _, short) in enumerate(PAGES):
        href = _relpath(HERE / out, here)
        cur = ' aria-current="page"' if out == active else ""
        items.append(f'<a href="{href}"{cur}><span class="k">[{k}]</span> {short}</a>')
    return "".join(items)


def _relpath(target: Path, start: Path) -> str:
    import os
    return os.path.relpath(target, start).replace(os.sep, "/")


def first_para(md: str) -> str:
    for block in md.split("\n\n"):
        b = block.strip()
        if b and not b.startswith(("#", "|", "*", "!", "-", "Related")):
            return re.sub(r"[*`\[\]]|\([^)]*\.md[^)]*\)", "", " ".join(b.split()))[:180]
    return "Cerbi, an AI document automation platform."


def build():
    metrics = json.loads((HERE / "metrics.json").read_text(encoding="utf-8"))
    charts = {"2-where-every-load-went": chart_outcome(metrics),
              "3-holds": chart_holds(metrics)}
    asof = metrics["as_of"]
    adrs = sorted((HERE / "decisions").glob("0*.md"))
    jobs = [(src, out, title, out) for src, out, title, _ in PAGES]
    jobs += [(f"decisions/{p.name}", f"decisions/{p.stem}.html",
              p.read_text(encoding="utf-8").splitlines()[0].lstrip("# "), "decisions/index.html")
             for p in adrs]
    for src, out, title, active in jobs:
        md = INDEX_MD if src == "index" else (HERE / src).read_text(encoding="utf-8")
        depth = out.count("/")
        root = "../" * (depth + 2)
        body = markdown(md, charts if src == "cost-and-metrics.md" else None)
        src_name = "the Markdown" if src == "index" else src
        src_href = ("https://github.com/trevordane/trevordane.github.io/tree/main/docs/cerbi"
                    if src == "index" else
                    f"https://github.com/trevordane/trevordane.github.io/blob/main/docs/cerbi/{src}")
        page = TEMPLATE.format(title=html.escape(title), desc=html.escape(first_para(md)),
                               root=root, logo=html.escape(LOGO), nav=nav(out, active),
                               body=body, src_href=src_href, src_name=html.escape(src_name), asof=asof)
        (HERE / out).write_text(page, encoding="utf-8")
        print("wrote", out)


if __name__ == "__main__":
    build()
