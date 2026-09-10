# MD-PR-S060 V2 — Prescriptive EOS-S05B Authority, Publication and Operational-Completeness Execution Pack

## 0. Supersession and authority

This file **supersedes before execution** the earlier file named:

`MD_PR_S060_EOS_S05B_AUTHORITY_PUBLICATION_AND_OPERATIONAL_COMPLETENESS.md`

Cursor must not execute both files, merge their instructions selectively, or preserve the earlier file as co-controlling authority. Move this V2 file unchanged to:

`docs/control/eos-s05b/MD_PR_S060_V2_PRESCRIPTIVE_EXECUTION_PACK.md`

Move the earlier S060 file, if present in the repository root, to:

`docs/control/eos-s05b/superseded/MD_PR_S060_V1_SUPERSEDED_BEFORE_EXECUTION.md`

Add an explicit heading to that relocated copy stating: `SUPERSEDED BEFORE EXECUTION BY MD-PR-S060 V2`. It must never be recorded as executed.

This V2 file is the sole controlling implementation authority for MD-PR-S060. Execute every phase in order. Do not skip a phase because later code appears to cover it. Do not improvise alternate architecture without stopping and reporting a concrete incompatibility.

EOS-S05B remains **NOT ACCEPTED**. EOS-S06 remains **NOT STARTED / NOT AUTHORISED**.

---

## 1. Exact scope and pre-flight

- Repository: `kglaw-Oluseyi/atelier-doclar`
- Branch: `main`
- Required starting local/origin/GitHub SHA: `2a701ed5f1f4d459eab8f30a3db9f48ab733af70`
- Current live Event OS SHA: `2356c5a8d15b019f0ad2387ecb07a481d52d553d`
- Railway: project `atelier-doclar`, environment `production`, service `event-os`
- Live URL: `https://event-os-production-bc8d.up.railway.app`
- Do not change or deploy Control Tower.

### Step 1.1 — prove baseline

Run and report:

1. `git status --short`
2. `git rev-parse HEAD`
3. `git rev-parse origin/main`
4. GitHub `main` SHA through the configured connection
5. current Event OS ready/deployed SHA

Stop if repository SHAs differ or the worktree contains overlapping changes. Do not reset or discard user work.

### Step 1.2 — read before editing

Read:

- ratified EOS-S05B documents 00–15;
- MD-PR-S054 through S059;
- `risk-schemas.ts`, `risk-dossier.ts` or the actual dossier operation files;
- `risk-continuity.ts`, `risk-incidents.ts`, `risk-budget-projection.ts`;
- `service.ts`, permission catalog/constants, normalized risk store/migration;
- Event OS `protection-scope.ts`, `risk-actions.ts`, organisation/event/client Protection pages;
- accepted private Atelier and discovery client-access implementations;
- current action-result/form/focus implementation.

Do not begin implementation until you can list the exact existing types, tables, permission keys and service methods that will be modified.

### Step 1.3 — reproduce before correction

Add focused failing tests or a local scripted reproduction for all three blockers before changing production logic:

1. Auditor invokes dossier assemble and changes durable state.
2. CEO publishes an approved dossier and receives the 503.
3. A new draft causes the previously published client projection to disappear.
4. A stale Protection Budget version/hash produces 503 instead of `VERSION_CONFLICT`.

Preserve these failing tests as regression tests. Do not merely describe the old failure after replacing it.

---

## 2. Phase A — explicit dossier permissions

### Step 2.1 — permission keys

Inspect the existing catalog. Reuse exact keys when available. If the current model has only `risk.dossier.view`, `approve`, `publish`, or a broad manage key, add missing keys with new collision-free permission IDs:

```ts
type DossierPermission =
  | "risk.dossier.view"
  | "risk.dossier.assemble"
  | "risk.dossier.submit"
  | "risk.dossier.approve"
  | "risk.dossier.publish"
  | "risk.dossier.export"
  | "risk.dossier.client_access.manage";
```

Do not authorize mutation through `risk.dossier.view`.

### Step 2.2 — canonical role grants

Implement this exact matrix unless a ratified document is stricter:

| Capability | Planner | Event Director | CEO | Auditor | System Admin |
|---|---:|---:|---:|---:|---:|
| view | yes | yes | yes | permission-safe only | no business access |
| assemble | yes | yes | yes | no | no |
| submit | yes | yes | yes | no | no |
| approve | no | yes | yes, subject to separation | no | no |
| publish | no | no | yes | no | no |
| export | governed | governed | yes | permission-safe only | no |
| client-access manage | no | governed if ratified | yes | no | no |

### Step 2.3 — server enforcement

Every service mutation must call `mutate(... permission: exactKey ...)`. Do not rely on page booleans.

Change the Event OS projection to include:

```ts
type DossierCapabilities = {
  canView: boolean;
  canAssemble: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canPublish: boolean;
  canExport: boolean;
  canManageClientAccess: boolean;
};
```

In the event page, replace the confirmed defect:

```tsx
// forbidden
permissions.dossierView && <AssembleForm />
```

with:

```tsx
permissions.dossierAssemble && <AssembleForm />
```

Apply corresponding exact checks to submit, approve, publish, export and client access.

### Step 2.4 — negative tests

For Auditor and System Administrator, directly call every mutation service method with a valid-looking command. Assert:

- `FORBIDDEN` or permission absence;
- no dossier edition/publication change;
- no success audit;
- no idempotency-success receipt;
- no disclosure in the error.

---

## 3. Phase B — separate working dossier truth from published client truth

### Step 3.1 — use two explicit aggregates

Do not use one `current` flag to mean both “latest working edition” and “published client truth”.

The final model must represent:

```ts
type RiskDossierEdition = {
  id: UUID;
  organisationId: UUID;
  eventId: UUID;
  versionNumber: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "SUPERSEDED" | "WITHDRAWN";
  contentHash: Sha256;
  authorPersonId: UUID;
  submittedByPersonId?: UUID;
  submittedAt?: IsoDateTime;
  approvedByPersonId?: UUID;
  approvedAt?: IsoDateTime;
  approvedHash?: Sha256;
  supersedesEditionId?: UUID;
  version: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

type RiskDossierPublication = {
  id: UUID;
  organisationId: UUID;
  eventId: UUID;
  editionId: UUID;
  contentHash: Sha256;
  publicationNumber: number;
  status: "CURRENT" | "SUPERSEDED" | "WITHDRAWN";
  publishedByPersonId: UUID;
  publishedAt: IsoDateTime;
  supersedesPublicationId?: UUID;
  version: number;
};
```

Align names with repository conventions, but preserve this separation.

### Step 3.2 — database constraints

Create a forward-only replay-safe migration if current tables/indexes cannot support the model.

Required constraints:

- at most one active working edition per event, excluding immutable historical editions;
- at most one `CURRENT` publication per event;
- publication foreign key/reference to an existing edition;
- publication content hash equals the approved edition hash;
- no absence-driven DELETE;
- existing published fixture dossier backfilled into a publication record deterministically;
- migration receipts durable and replay-safe.

Do not demote the current publication when assembling a draft.

### Step 3.3 — exact projection algorithms

Implement explicit selectors:

```ts
currentWorkingDossier(snap, eventId)
currentDossierPublication(snap, eventId)
publishedDossierEdition(snap, eventId)
```

`publishedClientDossierProjection` must perform:

1. find current publication;
2. resolve its exact edition ID;
3. verify hash equality;
4. apply permission-safe projection;
5. return it regardless of any newer DRAFT/SUBMITTED/APPROVED working edition.

It must never select “latest dossier edition” as a substitute for publication.

### Step 3.4 — publication transaction

`publishRiskDossier` must:

1. parse strict input;
2. require `risk.dossier.publish`;
3. load edition by organisation + event + ID;
4. require status APPROVED;
5. require `approvedHash === contentHash === input.approvedHash`;
6. require publisher differs from author and approver;
7. enforce expected version;
8. detect identical current publication and return `REPLAYED`;
9. in one transaction, insert new publication and demote the previous publication;
10. append audit and idempotency receipt;
11. commit;
12. reload and verify the publication before returning.

If anything fails, rollback all steps and retain the former publication.

### Step 3.5 — mandatory sequence tests

Test all:

- Planner assembles/submits;
- Planner self-approve denied;
- Director approves exact hash;
- Director publish denied;
- CEO publishes exact hash;
- approver-as-publisher denied;
- duplicate publish replays same ID;
- new draft does not change client projection;
- failed new publish does not change client projection;
- successful successor publish atomically changes client projection and supersedes prior publication.

---

## 4. Phase C — repair the 503/persistence boundary

### Step 4.1 — isolate the shared cause

Instrument tests around `runProtectionFormAction`, `withDurable`, normalized risk transaction, flush and Next redirect. Do not add retry loops to hide the fault.

The required lifecycle is:

```ts
const outcome = await withDurable(async () => {
  const result = await executeMutation();
  return verifyDurableResult(result);
});

await writeTruthfulActionResult(outcome);
redirect(resultHref(...));
```

The transaction and flush must finish before redirect is thrown.

Do not call `redirect()` inside a callback whose `finally` performs persistence. Do not let a persistence exception replace `NEXT_REDIRECT`. Do not write a success result before commit.

### Step 4.2 — error mapping

Map errors exactly:

| Condition | Code | Presentation |
|---|---|---|
| stale version/hash | `VERSION_CONFLICT` | record changed elsewhere |
| invalid transition | `TRANSITION_INVALID` | state cannot move that way |
| permission | `FORBIDDEN` / `PERMISSION_ABSENT` | action not permitted |
| missing scoped record | `NOT_FOUND` | safe unavailable |
| editable field invalid | `VALIDATION_FAILED` | inline field guidance |
| unexpected only | `INTERNAL_ERROR` | generic correlation |

A stale hidden version is not a malformed visible field. Render an accessible action-result heading, `NOT_APPLIED`, `didDataChange:false`, and a scoped reload/retry instruction. Do not return HTTP 503.

### Step 4.3 — Budget stale test

Use two independent contexts:

1. both load the same governing scenario/hash/version;
2. context B changes the governing record;
3. context A submits the stale Protection projection;
4. assert `VERSION_CONFLICT`, no 503, no new scenario/result/linkage, governing Budget unchanged;
5. F5 reconciles and unlocks only that action.

Do not simulate staleness solely by changing a hidden field in the final evidence; use a real concurrent state change.

---

## 5. Phase D — source and rule maker/checker

### Step 5.1 — immutable decision fields

Ensure both source and rule editions record author, submitter, approver, decision time and exact decided hash.

### Step 5.2 — shared separation guard

Create one reusable guard:

```ts
assertIndependentChecker({
  actorPersonId,
  authorPersonId,
  submitterPersonId,
  action: "approve",
});
```

Apply it server-side to source approval and rule approval. The author cannot approve even if CEO.

### Step 5.3 — fixture authority

Use a distinct authorised person already represented by the canonical role matrix. If Event Director lacks organisation rule/source approval by ratification, grant a narrowly scoped “Risk Governance Reviewer” fixture role/person rather than creating another CEO or weakening separation. Document why and keep System Administrator excluded.

---

## 6. Phase E — real client dossier access

### Step 6.1 — reuse accepted access architecture

Study accepted Atelier/discovery access grant and session code. Reuse its:

- high-entropy token generation;
- hash-only persistence;
- one-time plaintext delivery mechanism;
- expiry/revoke/renew lineage;
- attempt/rate controls;
- separate client cookie;
- secret-safe logs/actions.

Do not reuse staff cookies and do not put the token in normal query logs if the accepted pattern avoids it.

### Step 6.2 — required types

```ts
type RiskDossierAccessGrant = {
  id: UUID;
  organisationId: UUID;
  eventId: UUID;
  audiencePersonId?: UUID;
  purpose: "RISK_DOSSIER";
  tokenHash: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  issuedByPersonId: UUID;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  revokedByPersonId?: UUID;
  revokedAt?: IsoDateTime;
  version: number;
};
```

Add only fields consistent with existing access primitives.

### Step 6.3 — routes and UX

Staff event Dossier tab:

- “Issue client dossier access”;
- clear copy: creates access, does not send it;
- active grant status/expiry;
- renew/revoke;
- token displayed once through the accepted protected flash;
- labelled staff “Preview permission-safe client dossier”.

Separate client entry/session route:

- no staff navigation;
- resolves current publication every request;
- exposes permission-safe client projection only;
- allows acknowledgement/question;
- never approves, edits staff truth, or sends communications.

Test expired, revoked, wrong-org, wrong-event and direct staff route access.

---

## 7. Phase F — checkpoint command surface

### Step 7.1 — projection

Extend event Protection workspace with `checkpointInstances` containing:

```ts
{
  id;
  label;              // “72-hour power readiness”
  horizon: "72H" | "24H" | "6H" | "CUSTOM";
  dueAt;
  dueAtLagos;
  criticalFunctionLabel;
  vendorLabel;
  ownerRoleLabel;
  requiredEvidence;
  status;
  latestCheckIn;
  escalationState;
  nextAction;
  version;
}
```

Never make raw IDs primary labels.

### Step 7.2 — actions

Expose existing production functions for:

- generate instances idempotently;
- record immutable check-in/evidence;
- mark/derive missed status;
- evaluate internal escalation.

All pages must say that communications are inactive and no external reminder was dispatched.

### Step 7.3 — UI

Use a calm chronological command list. On mobile use labelled cards. Show overdue/unknown in text, not colour alone.

---

## 8. Phase G — structured incident and learning

### Step 8.1 — incident entry model

Do not treat prose prefixes as structure. Add explicit immutable incident entries:

```ts
type IncidentEntryKind =
  | "OBSERVED_FACT"
  | "REPORTED_CLAIM"
  | "HYPOTHESIS"
  | "DECISION"
  | "ACTION_TAKEN";

type RiskIncidentEntry = {
  id;
  incidentId;
  kind;
  body;
  sourceLabel?: string;
  confidence?: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";
  recordedByPersonId;
  recordedAt;
  supersedesEntryId?: UUID;
};
```

Preserve event phase, affected functions, safety flag and known/unknown exposure at incident level.

### Step 8.2 — learning lifecycle

Add:

```ts
type RiskLearningProposal = {
  id;
  incidentId;
  targetKind: "VENDOR_INDICATOR" | "CONTINUITY_TEMPLATE" | "RISK_RULE";
  proposition;
  evidenceEntryIds;
  status: "PROPOSED" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  proposedByPersonId;
  decidedByPersonId?;
  decidedAt?;
  reason?;
};
```

Maker cannot decide. Approval does not directly mutate the target; it authorizes a separate governed successor proposal through the target domain.

Expose incident detail, add-note/entry, propose learning and review controls. Retain explicit emergency-services copy and zero-dispatch truth.

---

## 9. Phase H — human labels and inert clause detail

### Step 9.1 — vendor labels

Resolve vendor assessment headings through the governed party projection:

- primary heading = vendor label;
- secondary disambiguation = organisation/context;
- UUID only in optional technical provenance for authorised staff;
- Auditor/client projection omits it when unnecessary.

### Step 9.2 — clause rendering

Create a detail view that renders the stored clause body as text, never `dangerouslySetInnerHTML`. Preserve exact Unicode and hash.

Test literal:

```text
<script>alert('inert')</script>
**not active markdown**
{{not_executed}}
```

Assert no script execution, no generated script element, no active markup and exact visible text.

---

## 10. Phase I — executable assurance

Because authority, publication, client access and incident/checkpoint contracts change, create an honest successor evaluation:

- edition: `s05b-eval-v4`
- contract version: increment consistently;
- previous v3 becomes `STALE`, never restamped.

Add only independent real-production-function cases:

1. `S05B-AUTH-AUDITOR-DOSSIER-DENY`
2. `S05B-DOSSIER-THREE-PERSON-PUBLISH`
3. `S05B-DOSSIER-LAST-GOOD-DURING-DRAFT`
4. `S05B-BUDGET-STALE-CONFLICT`
5. `S05B-CLIENT-GRANT-ISOLATION`
6. `S05B-CLIENT-GRANT-REVOKE`
7. `S05B-CHECKPOINT-PROJECTION-NO-DISPATCH`
8. `S05B-INCIDENT-STRUCTURED-EVIDENCE`
9. `S05B-LEARNING-NO-AUTO-MUTATION`
10. `S05B-SOURCE-MAKER-CHECKER`

Cases produce typed observations from durable state. They cannot set `passed`. Add mutation-sensitivity negatives for Auditor authority, vanished publication and false dispatch.

Run locally. After deployment, run once through the authorised CEO fixture. Record the run ID, exact hash, case count, persisted count and zero-tolerance categories.

---

## 11. Mandatory browser journeys

Create focused Playwright files, not one enormous fragile omnibus:

1. `s05b-s060-authority.spec.ts`
2. `s05b-s060-publication.spec.ts`
3. `s05b-s060-budget-conflict.spec.ts`
4. `s05b-s060-client-access.spec.ts`
5. `s05b-s060-continuity-incident.spec.ts`
6. `s05b-s060-human-detail.spec.ts`

Required evidence:

- Auditor forged dossier-assemble POST denied;
- Planner → Director → CEO exact-hash publish succeeds;
- new draft leaves old client publication visible;
- real two-tab Budget conflict is governed, no 503;
- checkpoint instances/check-ins visible;
- incident fact/claim structure and learning separation;
- staff issues access, signs out, client enters separate session, then revoked access fails;
- vendor label replaces UUID;
- hostile clause content inert;
- 360 px/tablet/desktop/200% zoom, keyboard/focus/reduced-motion on changed journeys.

Use independent browser contexts for roles. Never claim separation from shared cookies.

---

## 12. Gate order and milestone stops

Execute in this exact order:

1. failing reproductions;
2. Phase A permissions;
3. Phase B publication model/migration;
4. Phase C transaction/error boundary;
5. focused authority/publication/Budget unit tests;
6. Phase D source/rule separation;
7. Phase E client access;
8. Phase F checkpoints;
9. Phase G incident/learning;
10. Phase H human detail;
11. Phase I evaluation;
12. focused local Playwright;
13. full gates;
14. commit/push parity;
15. Event OS-only deployment;
16. readiness/migration verification;
17. authorised live v4 corpus;
18. focused live Playwright/smoke;
19. docs evidence stamp only;
20. final report and stop.

Stop early only if:

- a forward migration cannot preserve existing publications;
- the permission catalog cannot add collision-free authority;
- a required client-access secret must be supplied by George;
- a defect would corrupt accepted S05A Budget truth;
- the baseline changes or another actor modifies overlapping files.

Do not stop merely because one unit needed a correction. Record the failure and continue safely.

---

## 13. Full gates

Run:

- focused S060 tests;
- evaluation/readiness/mutation-sensitivity tests;
- `pnpm typecheck`;
- `pnpm --filter @maison-doclar/shared-platform test`;
- `pnpm --filter @maison-doclar/event-os test`;
- `pnpm programme:validate`;
- `pnpm --filter @maison-doclar/event-os build`;
- `git diff --check`;
- all six focused local Playwright files;
- changed-risk MD-PR-S058 validation regression.

Report every first-run failure, exact root cause and correction. Passing retries do not erase evidence.

---

## 14. Deployment and prohibitions

Commit in focused commits, push normally, prove local/origin/GitHub parity, and deploy Event OS only.

Verify:

- exact deployed SHA;
- alive/ready;
- POSTGRES;
- migrations APPLIED;
- `productionAuthorised:false`;
- providers inactive;
- S05A still PASSED;
- S05B v4 current and genuinely passed after authorised run.

Never:

- deploy Control Tower;
- touch another repository/Railway project;
- use real data;
- activate communications, insurers, OCR, scans, source monitoring, payments, bookings, claims, dispatch or biometrics;
- reveal secrets;
- perform a destructive reset/down-migration/absence DELETE;
- invent premiums, coverage or legal conclusions;
- run Claude;
- accept EOS-S05B;
- start EOS-S06.

---

## 15. Final report

Return one consolidated report containing:

1. starting/final/application/docs SHAs;
2. commits and files;
3. each reproduced first-run blocker;
4. exact permission keys and role matrix;
5. working-edition/publication schema and migration;
6. publication transaction and last-known-good proof;
7. shared 503 root cause and corrected lifecycle;
8. source/rule maker-checker proof;
9. client grant/session architecture;
10. checkpoint projection/actions;
11. structured incident/learning lifecycle;
12. vendor/clause UI proof;
13. v4 corpus edition/hash/cases/run;
14. focused/full gates and every first-run failure;
15. GitHub parity and Event OS deployment;
16. live synthetic evidence;
17. retained debt and recovery;
18. confirmations: Claude not run, EOS-S05B not accepted, EOS-S06 not started, Control Tower not deployed, production unauthorised.

Do not self-accept. Stop for independent AI CTO review.

`EOS-S05B MD-PR-S060 V2 PRESCRIPTIVE EXECUTION AUTHORISED — FOLLOW PHASES 1–15 IN ORDER — DEPLOY EVENT OS ONLY — REPORT AND STOP — NOT ACCEPTED — EOS-S06 NOT STARTED.`
