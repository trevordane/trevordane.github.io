# ADR 0004: Exact aliases before fuzzy matching; sender rules are never self-taught

**Status:** accepted · **Date:** 14 Sep 2026

## Context

The carrier on an invoice decides how it is attributed downstream. Fuzzy
matching extracted vendor names against the vendor list was measured on 94
real aliases: 83 correct, 7 no match (safe, falls to a person) and **4
confidently wrong**, at scores up to 0.85. One wrong match pointed at a
different real carrier. The same 4 failed against the full 3,125-row list,
so no threshold and no smaller candidate set fixes it.

Sender addresses are also unreliable: many carriers bill through shared
accounting-platform relays, which look exactly like a single carrier's
address.

## Decision

Resolution order is **sender rule → exact alias → fuzzy match → person**.

- A person's resolution writes a new alias (extracted name → carrier), so
  the exact layer grows and the fuzzy layer is used less over time.
- An alias is keyed on what was read off the page, never on the sender, so
  learning it automatically is safe.
- A **sender rule** (address → carrier) is written only by a person, never
  from a model's read. A model's guess may file a document; it may never
  teach the system who a sender is.

## Consequences

- Wrong attribution from fuzzy matching is replaced by a short review the
  first time a new name appears.
- Every fact carries its provenance (`read`, `rule`, `human`, `vlm`), which
  is what makes the "never self-taught" rule enforceable.
