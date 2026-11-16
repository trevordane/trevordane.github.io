# ADR 0008: One prompt for every carrier, with per-carrier context

**Status:** accepted · **Date:** Sep 2026

## Context

Different carriers lay out invoices differently, which tempts a prompt per
carrier. Per-carrier prompts drift apart, multiply testing, and cost more:
they break the byte-identical prompt that prompt caching needs. An earlier
copy of the extraction code had already drifted from the tool it was copied
from.

## Decision

One published prompt for every document, edited and versioned. What genuinely differs per carrier (aliases, known layouts,
expected fields) is added as context, not a different prompt. Before a
prompt change is published, it can be scored against the published one on
the labelled evaluation set, with both scores side by
side.

## Consequences

- One place to fix extraction behaviour, and a measured before-and-after for
  every change.
- Prompt caching remains possible. It matters most for large packets, where
  the same prompt is sent once for every invoice group.
- Hard layouts are handled by context and by the rules, not by
  special-case prompts.
