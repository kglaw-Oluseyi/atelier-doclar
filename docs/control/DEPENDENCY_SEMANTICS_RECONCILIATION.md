# Dependency Semantics Reconciliation

**Slice ID:** `MD-GR1`  
**Prompt Control ID:** `MD-PR-S006`  
**Native ID:** `GR1`  
**Product:** FOUNDATION  
**Decision:** `DEC-MD-GR1-DEPENDENCY-SEMANTICS`  
**Date:** 2026-09-05

This record reconciles the programme dependency model exposed during EOS-S01 acceptance. It is not Foundation acceptance, EOS-S01 acceptance, independent acceptance, or CEO production authorisation.

## Discovered contradiction

Maison Doclar already distinguishes:

1. implementation completion;
2. technical review;
3. programme progression authorisation;
4. formal slice acceptance;
5. protected independent acceptance;
6. CEO production authorisation.

Foundation / Control Tower progression was authorised after technical review, closeout, live deployment and CEO human verification, while those slices intentionally remained `IN_REVIEW`. EOS-S01 was then authorised and implemented on that basis.

The executable calculator treated every slice-to-slice `dependsOn` edge as:

```text
predecessor.status === ACCEPTED
```

That made EOS-S01 formally ineligible for acceptance unless the Foundation chain was manufactured as `ACCEPTED`. The historical DAG edge `EOS-S01 → MD-CT0` is real lineage and must remain. The contradiction was semantic coarseness, not a missing edge and not missing Foundation work.

## Previous semantics

- Undeclared `dependsOn` IDs that named a gate required `gates[id].status === APPROVED`.
- Every other `dependsOn` ID required the predecessor slice to be `ACCEPTED`.
- `IN_REVIEW` / `IN_PROGRESS` did not themselves require predecessors, so implementation could proceed while acceptance could not.
- No first-class fact existed for programme progression without formal acceptance.

## Corrected semantics

`SliceManifest.dependencyKinds` may declare one of:

| Kind | Meaning | Satisfied when |
|------|---------|----------------|
| `ACCEPTANCE` | Formal slice acceptance prerequisite | Predecessor status is `ACCEPTED` |
| `PROGRESSION` | Programme progression prerequisite | An immutable `PROGRESSION_AUTHORISED` fact exists for that exact predecessor → successor pair, with a named authorised actor and at least one evidence ID |
| `GATE` | Named gate prerequisite | Named gate status is `APPROVED` |

Resolution rule:

1. An explicit `dependencyKinds[id]` wins.
2. Otherwise a known gate ID remains `GATE`.
3. Otherwise the legacy default remains `ACCEPTANCE`.

Historical edges are not silently reinterpreted. EOS-S01 is the first declared `PROGRESSION` edge.

`PROGRESSION` is not satisfied by:

- predecessor `IN_REVIEW`;
- a commit existing;
- Cursor claiming completion;
- a one-off test run.

## Authority model

`PROGRESSION_AUTHORISED` requires:

- `authorisedBy` a named authority (not `UNKNOWN`, `Cursor`, or `cursor`);
- actor role in `REVIEWER | CEO | SPECIALIST | INDEPENDENT`;
- actor id not reserved;
- at least one evidence ID;
- the successor manifest to declare that predecessor as `PROGRESSION`.

Cursor, implementers, and system actors cannot self-authorise progression. Ingestion cannot emit `PROGRESSION_AUTHORISED` or `ACCEPTANCE_RECORDED`.

Progression authorisation is not production authorisation and does not change protected gates.

## Migration / backward compatibility

- Legacy `dependsOn` without `dependencyKinds` still means `ACCEPTANCE`, except undeclared gate IDs which remain `GATE`.
- The historical JSON Schema (`slice-manifest.schema.json`) is not rewritten. The executable Zod schema is the machine-validatable extension.
- Catalog and YAML manifests must stay parity-identical, including `dependencyKinds`.
- The DAG edge is retained. No special-case for `EOS-S01` or `MD-CT0` exists in `calculateSliceStatus`.

## Foundation → EOS-S01 classification

```text
EOS-S01.dependsOn = [MD-CT0]
EOS-S01.dependencyKinds.MD-CT0 = PROGRESSION
```

Recorded fact: `EVT-SEED-GR1-PROGRESSION-CT0-EOS-S01`  
Actor: CEO  
Evidence:

- `docs/control/DEPENDENCY_SEMANTICS_RECONCILIATION.md`
- `programme/decisions/DEC-MD-GR1-DEPENDENCY-SEMANTICS.yaml`
- `docs/control/EVENT_OS_ENTRY_GATE.md`
- `docs/control/HUMAN_LIVE_VERIFICATION.md`

This represents the already-ratified truth: Foundation is not formally accepted; Foundation progression into EOS-S01 is authorised.

## Why no Foundation acceptance was created

Formal acceptance still requires a named reviewer, timestamp, immutable commit SHA, and immutable COMMIT evidence. Foundation slices remain `IN_REVIEW` by design. Manufacturing `ACCEPTED` would falsify protected acceptance invariants.

## Why EOS-S02 remains gated

EOS-S02 keeps the legacy default:

```text
dependsOn: [EOS-S01]   # ACCEPTANCE
entryCriteria: prior Event OS slice accepted
```

EOS-S01 is not formally accepted, so EOS-S02 remains `NOT_STARTED` and not eligible.

## EOS-S01 acceptance evidence gap

EOS-S01 seed facts currently include implementation observation and review request. They do **not** include `COMMIT_LINKED` or immutable COMMIT evidence for `b815268e939cfbd0fc33ce10df77f1c8a1374d52`.

The calculator can record that evidence through the normal events. MD-GR1 does not manufacture EOS-S01 acceptance. The successor controlled action is the EOS-S01 acceptance record.

## Production / protected-gate status

| Gate | Status after MD-GR1 |
|------|---------------------|
| Independent acceptance | UNSIGNED |
| CEO production | UNSIGNED |
| Specialist biometric | UNSIGNED |
| Venue rehearsal | UNSIGNED |

**productionAuthorised:** false

## Resulting state

| Slice | Status |
|-------|--------|
| Foundation including MD-GR1 | `IN_REVIEW` |
| EOS-S01 | `IN_REVIEW` |
| EOS-S02 | `NOT_STARTED` / not eligible |
| Accepted count | 0 |

**KNOWN MD-GR1 TECHNICAL DEBT:** ZERO
