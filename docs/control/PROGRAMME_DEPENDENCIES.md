# Programme Dependencies

**Slice:** MD-CT0  
**Model:** Dependency DAG. Display order is secondary.  
**Machine graph:** `programme/slices/catalog.json`  
**Cycle report:** `programme/schema/dependency-cycle-report.json`

## Cycle report

| Measure | Value |
|---------|-------|
| Nodes (planning slices) | 80 |
| Edges | 87 |
| Unknown dependencies | 0 |
| Cycles | **0** |
| Verdict | **NO_CYCLES** |

If a future slice adds a mutual edge (for example Event OS Slice 8 ↔ Runtime R-series as required predecessors of each other), that is a blocker, not a display issue.

## Executive critical path (display)

Shared Foundation → Event OS foundations/control plane → Event-Day Runtime foundations → Premium Ushering → Academy → Marketing OS → Cross-system integration → Validation/release hardening.

This is the controlling **progression for executive summary**. The DAG is authoritative where interleaving is required.

## Authoritative DAG (condensed)

```text
MD-B0 → MD-CT0 → MD-CT1 → MD-CT2 → … → MD-CT9
                 ↓
              EOS-S01 → S02 → S03 → S04 → S05 → S06 → S07
                                                    ↓         ↘
                                              EDR-R00→…→R23   EOS-S09→S10→S11→S12→EOS-RECON
                                                    ↓
                                         (S08 retained, mapped, not a Runtime predecessor)
ACA-G0 → ACA-S01 → … → ACA-S16 → ACA-RECON     (ACA-G0 depends on EOS-S02)
USH-RECON depends on ACA-G0 + EOS-S06 + EDR-R11
MKT-M00 depends on EOS-S02 + ACA-G0 → M01 → … → M11
INT-CLOSE depends on EOS-S12 + EDR-R23 + ACA-S16 + MKT-M11 + USH-RECON + MD-CT9
```

Event OS Slice 8 (`EOS-S08`) depends on `EOS-S07` for historical sequence only. **Runtime does not depend on EOS-S08.** Executing both as equivalent runtimes is prohibited (OI-CT0-002).

## Cross-product prerequisites

| Edge | Why | Whole-product move? |
|------|-----|---------------------|
| Runtime R0 ← Event OS S07 | Package/credential/snapshot contracts | No — only foundations through credentials |
| Runtime R17 ← Academy OS integration contract | Staff/Academy gates | **No** — bounded contract only (OI-CT0-003) |
| Ushering recon ← Academy G0 + Event OS S06 + Runtime R11 | Course/assessment vs seating vs usher surface | No |
| Marketing M0 ← Event OS S02 + Academy G0 | Guest/identity and learning/consent boundaries | No |
| Control Tower must not block Event OS operations | Addendum: CT outage must not stop Event OS | CT1–CT9 are not predecessors of EOS-S01 except CT0 architecture wrapper |

## Shared models (must not fork)

Identity, organisation, event, guest, staff, consent and doctrine must remain shared. No product may quietly create a competing store. This is a dependency **constraint**, recorded as open item OI-CT0-005 until an implementation exists to enforce it.

## Missing dependencies

| Missing | Effect |
|---------|--------|
| Application foundation | All product implementation slices remain NOT_STARTED / blocked |
| Academy readiness **implementation** of the OS contract | R17 blocked even after Runtime R16 |
| Hosting/IdP/CI provider choice | CT3 and all deploys blocked; CT1 validator is not |
| Event-Day v1 pack | Historical compare unavailable; v2 is the located Runtime authority |

## Event OS ↔ Runtime boundary

| Plane | Owner | Must not |
|-------|-------|----------|
| Control plane (clients, events, guests, venues, credentials, cloud authority) | EVENT_OS | Absorb venue LAN write-authority |
| Runtime (signed package, devices, ledger, LAN cell, reconcile) | EVENT_DAY | Recreate Event OS control-plane domains |

Historical Event OS Slice 8 text remains in the corpus and is mapped, not deleted.
