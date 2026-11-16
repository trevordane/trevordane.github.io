# ADR 0007: An idempotent ledger that keeps the raw source

**Status:** accepted · **Date:** 16 Sep 2026

## Context

Documents arrive from a mailbox, folders and a telematics system, and the
same attachment can arrive more than once (forwarded, re-sent, re-dropped).
Whether a file still exists upstream says nothing about whether it was
already processed. Reads also get better over time, so old documents need
re-reading.

## Decision

- A SQLite ledger records one row per envelope ever seen, with a unique key
  on the source plus a content hash. The unique constraint doubles as the
  lock: two workers cannot claim the same document.
- The raw source is kept, so any document can be re-read with a newer prompt
  or model. A re-read supersedes the old loads instead of adding to them.
- Archiving moves a file aside; nothing is deleted.
- Filed folders carry a manifest with the SHA-256 of every file, and a
  `--verify` command checks them.

## Consequences

- No document is read twice by accident, and no load is counted twice.
- Disk use grows with the corpus; the app reports what uses space and keeps
  nightly backups of the ledger.
