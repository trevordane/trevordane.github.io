# Cerbi: architecture decision records

Short records of the decisions that shaped Cerbi. Each gives the context,
the decision and its consequences. Dates are when the decision was made.
Related: [design](../design.md) · [cost and metrics](../cost-and-metrics.md).

*An architecture decision record (ADR) is a one-page note written when a
design choice is made, so the reasoning survives after the people who made
it move on.*

| # | Decision | Date |
|---|---|---|
| 0001 | [Stub extraction by default; real reads are opt-in](0001-stub-by-default.md) | 15 Sep 2026 |
| 0003 | [Batch API for routine reads, live reads only when urgent](0003-batch-by-default.md) | Oct 2026 |
| 0004 | [Exact aliases before fuzzy matching; sender rules are never self-taught](0004-exact-before-fuzzy.md) | 14 Sep 2026 |
| 0005 | [Stop the run on credential and configuration errors](0005-circuit-breaker.md) | 15 Sep 2026 |
| 0006 | [Short hold reasons, and two hold queues](0006-short-reasons-two-queues.md) | 5–6 Oct 2026 |
| 0007 | [An idempotent ledger that keeps the raw source](0007-idempotent-ledger.md) | 16 Sep 2026 |
| 0008 | [One prompt for every carrier, with per-carrier context](0008-one-prompt.md) | Sep 2026 |
