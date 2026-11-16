# ADR 0003: Batch API for routine reads, live reads only when urgent

**Status:** accepted · **Date:** Oct 2026

## Context

The Batch API bills at half the interactive rate and has no per-call
throttle, but results arrive asynchronously. Freight paperwork is rarely
needed within minutes.

## Decision

Routine reads go through automatic batches. A batch is submitted when
enough documents are waiting or the oldest has waited long enough, and is
planned, priced and trimmed to a per-batch cap and a rolling 24-hour cap
before it is sent. Small batches with a short maximum wait keep most
paperwork on its load within the hour. Live reads at full price remain for
single documents and a person's re-read; a rule that sends urgent loads
live is planned.

## Consequences

- Batch reads cost half the live rate per token. In production a batched
  document costs about half as much as a live one, and 72% of documents now
  go by batch. (The early projection, from a 51-document sample, was
  lower; measured cost came in about 1.75× higher.)
- Batches have to survive partial failure: a failed part is retried, and
  page tags already paid for are reused rather than bought again.
- Planning and estimates live next to the cap, so a mis-sized batch is
  refused before it is paid for.
