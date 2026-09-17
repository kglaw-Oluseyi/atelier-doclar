# Aggregation equivalence definition (Checkpoint 2)

## Key used for aggregation classes

`aggregation_equivalence_key = (sorted_domain_tables, sorted_guest_attrs)`

Two singleton guests may share a class only when both keys match **and** neither is forced to core.

## Forced core (never aggregated)

| Characteristic | Why core |
|---|---|
| Multi-member together-unit | HARD together incidence — not a singleton |
| Apart-pair endpoint | HARD apart incidence |
| Seat lock | Placement fixed |
| Table lock | Domain singleton / fixed table |
| Soft preference membership | Different objective coefficients |
| Baseline / retention assignment | Movement objective contribution |
| Reservation GUARANTEE/HOLD holder | Reservation semantics |
| Differing domain (require/forbid/zone) | Captured by domain in key — different domains → different classes |
| Differing accessibility attrs | Captured by attrs in key |

## Fields intentionally not in the key

| Field | Why |
|---|---|
| Guest token / display identity | Index-map only; not solver-relevant for Stage A |
| Information-only rules | Excluded from child payload; do not affect domains/objectives |
| JSON input order | Canonicalised before compile |
| Tie-break token order | Expansion uses sorted guest ids within class |

## Expansion contract

After Stage A, `expand_guest_table_assignment`:

1. Places core unit members on their assigned table.
2. Expands each class by walking domain tables in order and assigning the next sorted guest id for each count `n[c,t]`.
3. Requires every class guest to be placed exactly once when the class is fully seated.

## Mutation policy

Omitting any forced-core check or dropping `attrs` / `domain` from the key must fail negative-boundary tests.
