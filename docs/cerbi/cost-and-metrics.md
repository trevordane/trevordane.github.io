# Cerbi: metrics report

**Covers:** documents received in October 2026 · **Author:** Trevor Dane Respress

Every figure here comes from [`metrics.py`](metrics.py) (output in
[`metrics.json`](metrics.json)), which holds aggregates from Cerbi's own
analytics report for the month. That report reads every document, load,
hold and correction in Cerbi's ledger. Money is left out on purpose: no
costs, invoice amounts or wages. Related: [design](design.md) ·
[case study](case-study.md).

---

## 1. Headline numbers

| Metric | October 2026 |
|---|---:|
| Documents received | **9,064** (about 380 a weekday) |
| Loads read from them | **13,735** |
| Loads filed | **13,255** (96.5%) |
| Filed with no person touching them | **7,133** (51.9%) |
| Email in to filed or held, median | **21 hours** (90th percentile 7.5 days) |
| Documents that failed outright | **5** |
| Filed loads a person corrected | **2.0%** (a lower bound on errors) |

## 2. Where every load went

| Status | Loads | Share |
|---|---:|---:|
| Filed, no person touched it | 7,133 | 51.9% |
| Filed after a hold or a person's action | 6,122 | 44.6% |
| Limbo (waiting for paperwork) | 211 | 1.5% |
| Rejected (not a load: duplicates, superseded copies) | 135 | 1.0% |
| Purgatory (a person decides) | 134 | 1.0% |
| **Total** | **13,735** | 100% |

**Two automation figures, and why both matter.** 96.5% of loads end up
filed. 51.9% get there without anyone touching them. Most of the rest were
held for a while and then cleared by Cerbi itself, usually because an
invoice and its bill of lading (BOL) arrive separately and the first one
waits for the second.

## 3. Holds

October's loads were held **10,731 times**. How those holds ended:

| Outcome | Holds | Share |
|---|---:|---:|
| Cleared by Cerbi (a later check let it go) | 4,621 | 43% |
| Replaced by a re-read | 4,588 | 43% |
| Cleared by a person | 1,122 | 10% |
| Still open | 345 | 3% |
| Discarded | 55 | 1% |

So most holds are waiting, not work: a person cleared about one hold in
ten. A load can be held more than once, so these are holds, not loads.

The biggest and slowest hold is **"no matching load in the ERP after a
re-read"**: 3,123 holds, median 47 hours to clear, 90th percentile 161
hours. Cerbi cleared 2,448 of them itself when the matching load was
entered in the ERP. It is the main reason a held document waits a median
**47.5 hours** in Purgatory, and shortening it is a question about when
loads reach the ERP, not about reading.

Holds that will not clear by themselves, still open at the end of the
month:

| Held because | Open |
|---|---:|
| Supporting paperwork whose BOL never arrived | 196 |
| No matching load in the ERP after a re-read | 66 |
| Missing BOL number | 34 |
| Matching load not confirmed | 17 |

## 4. Volume and speed

| | October |
|---|---:|
| Documents a weekday | 379 |
| Documents a weekend day | 81 |
| From the fleet's telematics system | 3,686 (41%) |
| From saved email files | 2,971 (33%) |
| From the shared mailbox | 2,326 (26%) |
| From uploads | 81 (1%) |
| Email in to filed or held, median | 21 hours |
| Email in to filed or held, 90th percentile | 179 hours |

## 5. Where the model spend goes

Shares only. Telematics documents arrive already typed and cost nothing to
read.

| Read path | Documents | Share of spend |
|---|---:|---:|
| Read one at a time | 3,247 | 37% |
| Batch read (half price) | 3,309 | 27% |
| Grouped packet, batch | 115 | 19% |
| Grouped packet | 86 | 17% |
| Telematics (already typed) | 3,686 | 0% |

About **2% of documents, the large grouped packets, take 36% of the
spend.** A cap on parts, or a cheaper first pass for them, is where cost
would move. A batch read costs about 28% less a document than a single
read.

## 6. Freight audit

| | Loads |
|---|---:|
| Duplicate invoices closed, not paid twice | 61 |
| BOL billed on another invoice, sent to a person to confirm | 37 |
| Resent with changes, waiting on which copy is owed | 76 |

Each duplicate was closed by a rule. Resent invoices are waiting on a
decision, so they are not counted as caught.

## 7. Quality and reliability

| | |
|---|---:|
| Documents that failed outright | 5 of 9,064 |
| Filed loads a person corrected | 2.0% |
| Fields corrected | BOL number 220, load number 144, carrier 93, order number 13, delivery date 6 |

The correction rate is a **lower bound** on read errors: a wrong value
nobody changed is not counted. A true accuracy figure needs a randomly
picked, hand-checked sample, which is the next measurement to take. Until
then, no accuracy rate is claimed.

## 8. Engineering metrics (26 October)

| Metric | Value |
|---|---:|
| First commit | 15 Sep 2026 |
| Commits | 1,355 |
| Merged pull requests | 485 |
| Release tags | 193 |
| Application Python | ~82,000 lines |
| Test code | ~67,000 lines in 210 modules |
| Test functions | ~3,800 |
| Review app (single HTML file) | ~14,600 lines |
| Internal design documents | 31, about 220,000 words |
| Commits written by AI coding agents (reviewed and merged by me) | ~70% |

## 9. Method and sources

- Cerbi analytics report, run 10 Nov 2026 21:05 UTC, covering documents
  received 1–31 October 2026. Only aggregates are published; internal
  system names are generalised.
- One month only. Earlier versions of this page used all-time totals with
  a stricter "never held" definition; they are retired rather than mixed
  with this month's figures.
- Repository metrics: counted from a clone of the private repository on
  26 Oct 2026.
