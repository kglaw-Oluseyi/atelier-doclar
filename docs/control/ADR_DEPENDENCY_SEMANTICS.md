# ADR — Programme dependency progression semantics

**Status:** Controlling  
**Slice:** MD-GR1  
**Prompt Control ID:** `MD-PR-S006`  
**Decision ID:** `DEC-MD-GR1-DEPENDENCY-SEMANTICS`  
**Date:** 2026-09-05

## Context

EOS-S01 acceptance was blocked because every slice-to-slice `dependsOn` edge required `ACCEPTED`. Foundation slices were intentionally left `IN_REVIEW` after technical review, closeout, live deployment and CEO human verification. EOS-S01 was authorised and implemented on that progression, not on formal Foundation acceptance.

## Decision

Introduce first-class dependency kinds on the executable manifest:

- `ACCEPTANCE` — predecessor must be formally `ACCEPTED` (legacy default).
- `PROGRESSION` — predecessor → successor must have a governed `PROGRESSION_AUTHORISED` event.
- `GATE` — named gate must be `APPROVED`.

Do not special-case EOS-S01 or MD-CT0 in the status calculator. Do not delete the DAG edge. Do not mark Foundation slices `ACCEPTED`. Do not treat `IN_REVIEW` as progression authority.

## Consequences

- EOS-S01 can become eligible for its own later acceptance without mass Foundation acceptance.
- EOS-S02 remains gated on EOS-S01 `ACCEPTED`.
- Protected gates and production authorisation are unchanged.
- Historical JSON Schema remains frozen; Zod is the executable extension.
