"""Cerbi metrics, October 2026.

Every number in docs/cerbi/*.md comes from this file. All of them are
MEASURED: aggregates read off Cerbi's own analytics report for documents
received 1-31 October 2026 (run 2026-11-10 21:05 UTC). The raw report names
internal systems and carries BOL and load numbers, so it is not in this
repo. Money is left out on purpose: no costs, invoice amounts or wages.

    python docs/cerbi/metrics.py      # rewrites metrics.json

No dependencies beyond the standard library.
"""

import json
from pathlib import Path

AS_OF = "October 2026"
REPORT_RUN = "2026-11-10 21:05 UTC"

# ------------------------------------------------------------ volume
DOCUMENTS = 9_064
PER_WEEKDAY, PER_WEEKEND_DAY = 379, 81
SOURCES = {                    # how documents came in
    "Fleet telematics": 3_686,
    "Saved email files": 2_971,
    "Shared mailbox": 2_326,
    "Uploads": 81,
}
DOCS_FAILED = 5

# ------------------------------------------------------------ loads
LOADS = 13_735
FILED = 13_255
FILED_UNTOUCHED = 7_133        # filed with no person touching it
NOT_FILED = {"limbo": 211, "rejected": 135, "purgatory": 134}

# ------------------------------------------------------------ holds
HOLD_OUTCOMES = {              # how October's 10,731 holds ended
    "Cleared by Cerbi": 4_621,
    "Replaced by a re-read": 4_588,
    "Cleared by a person": 1_122,
    "Still open": 345,
    "Discarded": 55,
}
BIGGEST_HOLD = {"name": "No matching load in the ERP after a re-read",
                "holds": 3_123, "median_h": 47.1, "p90_h": 160.6, "cleared_by_cerbi": 2_448}

# ------------------------------------------------------------ speed
EMAIL_TO_DECISION_H = {"median": 21, "p90": 179}
PURGATORY_MEDIAN_H = 47.5

# ------------------------------------------------------------ quality
CORRECTED_PCT = 2.0            # filed loads a person changed: a lower bound on errors
FIELD_EDITS = {"BOL number": 220, "load number": 144, "carrier": 93, "order number": 13, "delivery date": 6}

# ------------------------------------------------------------ freight audit (counts only)
AUDIT = {"Duplicate invoices closed, not paid twice": 61,
         "BOL on another invoice, sent to a person to confirm": 37,
         "Resent with changes, waiting on which copy is owed": 76}

# ------------------------------------------------------------ read paths (share of model spend, no amounts)
READ_PATHS = [  # (path, documents, share of spend %)
    ("Read one at a time", 3_247, 37),
    ("Batch read", 3_309, 27),
    ("Grouped packet, batch", 115, 19),
    ("Grouped packet", 86, 17),
    ("Telematics (already typed)", 3_686, 0),
]


def pct(n, d):
    return round(100 * n / d, 1)


def build():
    filed_helped = FILED - FILED_UNTOUCHED
    holds = sum(HOLD_OUTCOMES.values())
    m = {
        "as_of": AS_OF,
        "report_run": REPORT_RUN,
        "documents": DOCUMENTS,
        "sources": {k: {"n": v, "pct": pct(v, DOCUMENTS)} for k, v in SOURCES.items()},
        "outcome": {
            "loads": LOADS,
            "filed": FILED, "filed_pct": pct(FILED, LOADS),
            "filed_untouched": FILED_UNTOUCHED, "filed_untouched_pct": pct(FILED_UNTOUCHED, LOADS),
            "filed_with_help": filed_helped, "filed_with_help_pct": pct(filed_helped, LOADS),
            **{k: v for k, v in NOT_FILED.items()},
            **{f"{k}_pct": pct(v, LOADS) for k, v in NOT_FILED.items()},
        },
        "holds": {"total": holds,
                  "outcomes": {k: {"n": v, "pct": pct(v, holds)} for k, v in HOLD_OUTCOMES.items()},
                  "biggest": BIGGEST_HOLD},
        "speed": {"email_to_decision_h": EMAIL_TO_DECISION_H, "purgatory_median_h": PURGATORY_MEDIAN_H},
        "quality": {"corrected_pct": CORRECTED_PCT, "field_edits": FIELD_EDITS, "docs_failed": DOCS_FAILED},
        "audit": AUDIT,
        "read_paths": [{"path": p, "documents": d, "spend_pct": s} for p, d, s in READ_PATHS],
    }
    assert FILED + sum(NOT_FILED.values()) == LOADS
    out = Path(__file__).with_name("metrics.json")
    out.write_text(json.dumps(m, indent=2) + "\n", encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    build()
