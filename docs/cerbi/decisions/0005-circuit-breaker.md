# ADR 0005: Stop the run on credential and configuration errors

**Status:** accepted · **Date:** 15 Sep 2026

## Context

On the first real run, a new API key was disabled within about 20 minutes.
Usage was tiny; the problem was the shape. The per-document error
handler treated every failure the same way, so the first authentication
error was effectively retried by sending each remaining document: about 157
requests against a rejected key, plus requests that were too large to ever
succeed. From outside that looks like credential probing.

## Decision

An error is classified as belonging to the **document** or to the **run**.

| Status | Response |
|---|---|
| 401, 403, 404, 429 | abort the run |
| a corrupt PDF, unparseable output | record, count, continue |

Two more brakes catch failures with no status: three failures in a row, or
a failure rate above about 34% after twelve documents, stop the run. Spend
caps stop a run that passes its ceiling. Requests that cannot succeed (too
large, too many pages) are never sent; large documents are uploaded first.
An aborted run still closes its run record.

Alongside: debug with one document (`run.py document <file>`), and keep the
key encrypted for one application on one machine.

## Consequences

- Verified by simulation: a 401 on the first document stops after 1 call
  instead of 157; one bad document in nine lets all 51 finish.
- A real outage stops processing instead of quietly failing every document,
  which is the behaviour operators want.
