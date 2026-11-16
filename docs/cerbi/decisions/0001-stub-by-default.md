# ADR 0001: Stub extraction by default; real reads are opt-in

**Status:** accepted · **Date:** 15 Sep 2026

## Context

Real extraction costs money on every call, and most of the pipeline
(ingest, segmentation, identification, the rules, filing, the review
app) does not need a real read to be tested. The first real run also showed
that an unattended loop against a paid API is the riskiest thing the system
does.

## Decision

The extractor is a stub unless `CERBI_REAL_EXTRACTION=1` is set *and* a key
is stored for this application. The stub returns realistic, schema-valid
reads, so every other stage runs for free in development, CI and tests.
Real reads are switched on deliberately, per run.

## Consequences

- About 3,800 tests run with no key and no network.
- A new machine, or one whose key is missing, cannot spend by accident.
- The stub has to be kept in step with the real output schema.
- Read quality itself is measured separately, by the evaluation harness on
  51 labelled documents.
