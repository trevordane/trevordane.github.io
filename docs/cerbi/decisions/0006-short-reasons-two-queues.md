# ADR 0006: Short hold reasons, and two hold queues

**Status:** accepted · **Date:** 5–6 Oct 2026

## Context

Held loads carried long, value-filled reasons, so no two read the same and
the hold list could not be grouped or filtered. And "held" covered two
different situations: loads a person had to decide, and paperwork that was
simply early (a BOL before its invoice).

## Decision

- Every rule that holds, re-reads or discards carries a **short reason**: at
  most six words, no values, the same words for every load it holds. The
  numbers and what to do go in a separate **note**. 
- Two queues: **Purgatory** for loads a person must decide, and **Limbo** for
  loads waiting on paperwork, which re-run themselves when it arrives.
- **Recheck** re-runs every rule against fresh reference data without a
  paid re-read, keeping anything a person typed.

## Consequences

- Purgatory reads as a grouped to-do list: a count under each short reason.
- Purgatory fell from 4,645 loads (12.6%) on 6 Oct to 1,358 (2.7%) on
  30 Oct, while total loads grew 35%.
- Of holds closed with a decision, 52.6% were cleared by Cerbi itself and
  42.7% by a person; the median hold clears in 21.6 hours.
- Limbo has to be watched for paperwork that never comes; an aged-holds
  report covers that.
