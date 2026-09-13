# MD-PR-S075 forensic table-namespace finding

**Authority:** `docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`
**Authority SHA-256:** `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`
**Deployed application SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Read method:** SELECT / `BEGIN READ ONLY` against the live Event OS Postgres. No mutation, freeze, launch or audit write.
**Temporary diagnostic tunnel:** A local SSH forward to Railway Postgres on `127.0.0.1:55432` was used only for this Section 2 read. The required package evidence was captured before the tunnel ended. The tunnel was temporary, read-only diagnostic infrastructure. Section 2’s finding remains valid. Section 2 is not repeated. No redeployment, rollback or reconnect is authorised solely because the tunnel ended.
**Tunnel closure (2026-09-13):** Port `55432` has no listener. No `ssh -L` or Railway SSH process remains. Local Homebrew `postgresql@16` is a pre-existing machine service and was not treated as the S075 tunnel. Subsequent S075 proof uses repository tests and governed live UI journeys only. Direct database access is not a substitute for required product workflows.
**Canonical token function:** `exactHash` from `packages/shared-platform/src/eec-hash.ts`, invoked as `exactHash({ table: tableObjectId }).slice(0, 32)` — the exact position expression in `seating-v2-package.ts`. The hash algorithm was not retyped.

## Baseline confirmation (Section 1.2)

Latest live evaluation rows remain `s06-eval-v3` / `s06-eval-contract-v2` / 35/35 PASSED, hash `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c`. Prior `s06-eval-v2` remains history. Production remains unauthorised. Providers remain INACTIVE.

## Exact package

Exactly one immutable input package matched `contentHash` prefix `bad17b83dc9f` on event `6f88bc98-18c8-4379-bff4-ac8041d0043b` in organisation `00000000-0000-4000-8000-000000000001`.

| Field | Value |
|---|---|
| Package ID | `2506a80a-9bb4-4f75-882a-e2d7b70118d8` |
| Content hash | `bad17b83dc9fbe30cea98d110628ef7a54b32c1d969cc2707115cf9f72c6c036` |
| Semantic hash | `e3f9b7eb64702f8bb245a2134db321c32af4ef5d8205bf717fb0cb0ebb7b8b80` |
| Compiled request ID | `f9e19782-804d-4f7e-b6f3-35971dfee52c` |
| Compiled request hash | `8ea6154944200212c4e3cdfc2a37291a52c86c7390ea1bf3cd33d5f70733da59` |
| Layout publication | `295903a8-4473-43bd-ab7f-b34373403acb` |
| Layout content hash | `9699d8d21386bfa0c3d2bf4afbb0ac9244fbc4f0b4ee334ed37b7d3a195fed37` |
| Compiler/solver contract | `eos-s06-solver-v2` / `s06-solver-v2` |
| Solver config hash | `a74dff9f78aae56d199ae582cff47fb797b1de0cfdba9542c90ce097daed6748` |
| Seed | `s06-v2-default-seed` |
| Validator version | `s06-validator-v3` |
| Package rules / reservations | 4 / 0 |
| Guests / positions | 4 / 16 |
| Compiled reservations | 0 |

## Run and verdict

| Field | Value |
|---|---|
| Run ID | `3fc90250-6412-46db-a4db-788f2bc54936` |
| Run status | `INFEASIBLE` |
| Solver claim | `FEASIBLE` |
| Independent verdict | `INFEASIBLE` (`d32a0d1c-61fe-4253-953e-d5495ed39071`) |
| Assignments | 2 SEATED / 2 UNSEATED |

The historic package, compiled request, run and validation report were not rewritten.

## Expected mismatch — proven

ACTIVE HARD `REQUIRE_TABLE` edition `bc31551c-092f-4769-b0a0-0501cbcd6222`:

```text
raw target is a published layout object UUID (36 characters)
position table tokens are derived 32-character tokens
raw target ∩ position table tokens = empty
canonicalToken(raw target) ∈ position table tokens
```

| Check | Result |
|---|---|
| Raw target length | 36 |
| Raw target UUID-shaped | yes |
| Position table tokens | `908de37ced83034b9c1bd8e81aaad075` (8 seats), `7d0d161c54933e892b6a138150e50f15` (8 seats) |
| Raw target present in positions | **no** |
| Canonical token of raw target | `908de37ced83034b9c1bd8e81aaad075` |
| Canonical token present in positions | **yes** |
| Compiled `REQUIRE_TABLE` token length | 36 |
| Compiled token UUID-shaped | yes |
| Compiled token present in positions | **no** |
| Canonical of compiled raw token | `908de37ced83034b9c1bd8e81aaad075` |

`compileRule` copied `target.idOrCode` unchanged into `tableTokens`. Positions used `exactHash({ table: objectId }).slice(0, 32)`. The solver therefore filtered an empty domain for the required table. A failed candidate was claimed `FEASIBLE`; the independent validator correctly returned `INFEASIBLE`.

## Affected surface (non-governing history)

- No `FORBID_TABLE` edition exists on this event. The same `compileRule` path would emit a raw UUID for that predicate.
- Three historic TABLE reservations exist (`bf352bcd…`, `2e82a6b4…`, `fac043d7…`), all **WITHDRAWN**. Each raw target is a 36-character UUID; `canonicalToken` of each is `7d0d161c54933e892b6a138150e50f15` and is present in positions; the raw UUID is not. They did not govern this package (`reservationCount` 0).
- One historic WITHDRAWN `REQUIRE_TABLE` edition `4a1a343d-21ce-4f36-80fd-748d83bf36e5` has the same raw-UUID shape.

## Rejected alternative explanations

- Unexpected governing reservation: absent.
- Unexpected extra package match: exactly one `bad17b83dc9f…` row.
- Canonical token absent from positions: present (`908de37c…`).
- Validator error: validator correctly refused the solver's FEASIBLE claim.
- Another layer first: the compiled/position token inequality is sufficient and confirmed on the durable request.

## Code-path map

| Concern | File / symbol |
|---|---|
| Position token creation | `packages/shared-platform/src/seating-v2-package.ts` `buildSeatingV2Package` — `exactHash({ table: table.objectId }).slice(0, 32)` |
| Hash primitive | `packages/shared-platform/src/eec-hash.ts` `exactHash` |
| `compileRule` | `packages/shared-platform/src/seating-v2-compiler.ts` `compileRule` — `tableTokens: … item.idOrCode` |
| `compileReservation` | same file `compileReservation` — same raw `idOrCode` |
| Rule-target persistence | `packages/shared-platform/src/seating-v2-state.ts` `SeatingV2RuleTarget.targetIdOrCode`; table `seating_v2_rule_targets` |
| Rule form | `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx` `seating-constraint-form` — `tableId` is layout `objectId` |
| Rule action | `apps/event-os/src/server/seating-actions.ts` `createSeatingConstraintAction` — `targets: [{ type: "TABLE", idOrCode: tableId }]` |
| Rule command/schema | `packages/shared-platform/src/seating-v2-command-service.ts` `createRule`; `packages/shared-platform/src/seating-v2-schemas.ts` |
| Reservation form/action | seating page reservation form; `seating-actions.ts` `seating.reservation.create` — same `tableId` |
| Reservation compile | `compileReservation` as above |
| Solver table filter | `packages/shared-platform/src/seating-solver-v1.ts` `REQUIRE_TABLE` / `FORBID_TABLE` domain filter on `payload.tableTokens` vs `position.tableToken` |
| Adapter | `packages/shared-platform/src/seating-v2-solver-adapter.ts` |
| Validator table comparison | `packages/shared-platform/src/seating-v2-validator.ts` `REQUIRE_TABLE` / `FORBID_TABLE` |
| Forbidden-identity guard | `seating-v2-compiler.ts` `assertNoForbiddenFields` — key-suffix / `*Id` only; raw UUID in `tableTokens` is not rejected |
| Run reuse | `seating-v2-command-service.ts` `launchRun` — `packageHash` + `solverVersion` + `solverConfigHash` + `deterministicSeed` (compiler/validator versions are not in the reuse tuple) |
| Evaluation table targets | `packages/shared-platform/src/seating-evaluation-v2-runner.ts` `requireTable()` uses published layout `objectId`; compiled through the same raw-target compiler |

## Decision

The expected namespace mismatch is present. The canonical token computed by current position code is present in compiled positions. No unexpected governing authority explains the INFEASIBLE result first.

**Section 2 exit gate: PASS. Sections 3 onward are authorised.**
