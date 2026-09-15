# EOS-S06 — Final Technical Assurance Before Acceptance

**Not acceptance.** EOS-S06 remains unaccepted pending AI CTO decision. EOS-S07 remains unstarted. Control Tower not deployed.

## Scope

Three remaining technical-assurance items only. Claude’s Stage A→B successor journey treated as **PASS** (not re-run).

Starting identities:

| Role | Value |
|------|-------|
| Deployed Event OS SHA (start) | `a32d4f7e436badcb1dff7d6f364b57b80a3aabe7` |
| Docs HEAD (start) | `1d4b9eb621c51d6ff84b5e521a1be9af785af2b6` |
| Railway | atelier-doclar / production / event-os |
| Live origin | `https://event-os-production-bc8d.up.railway.app` |

## 1. HTTP status disposition

**Disposition: `BROWSER TOOL REPORTING ARTIFACT`**

Claude’s browser network view reported HTTP 503 for four successful A→B mutations. Event OS / Railway application evidence does **not** corroborate application or edge 503 for those durable successes.

### Correlation → request / status table

| Correlation | Command | Durable outcome | App settlement (md.seating.settlement) | Platform audit | True HTTP (evidence) |
|-------------|---------|-----------------|----------------------------------------|----------------|----------------------|
| `afa15268-af10-460f-81f3-9caa4e3f4c31` | `seating.layout_binding.propose` (A) | Binding `adae3f65…` created; later SUPERSEDED after B | Rotated out of recent app log window | `platform_audit` SUCCESS at `2026-09-15T09:50:27.245Z` (`correlationId` match) | Same success path as peers (TX commit + result); no app 503 |
| `5abbdfc9-a457-4d78-a853-c85a7ed6d5f1` | `seating.layout_binding.activate` (A) | A activated then later SUPERSEDED | `TX_COMMIT` → `ACTION_RESULT_WRITTEN`/`APPLIED` → `REDIRECT_EMITTED`/`SUCCESS` → `HTTP_RESPONSE`/`NEXT_REDIRECT` → `RENDER_RESULT_FOUND`/`PRESENTED` | SUCCESS `2026-09-15T10:16:48.007Z` | Server-action success via Next.js redirect (not 503) |
| `6423da42-935c-489c-838f-f9de381c7aeb` | `seating.layout_binding.propose` (B) | Binding `94cc6ffa…` DRAFT then ACTIVE | Same settlement chain ending `HTTP_RESPONSE`/`NEXT_REDIRECT` | SUCCESS `2026-09-15T10:19:20.146Z` | Server-action success via Next.js redirect (not 503) |
| `71519c6d-c851-454d-adf5-df267e4b6a54` | `seating.layout_binding.activate` (B) | Layout B sole ACTIVE | Same settlement chain ending `HTTP_RESPONSE`/`NEXT_REDIRECT` | SUCCESS `2026-09-15T10:31:46.223Z` | Server-action success via Next.js redirect (not 503) |

Answers to the six inquiry points:

1. **Did Event OS/Railway actually return 503?** No evidence of application or edge 503 for these successful mutations. Settlement logs classify the action response as `NEXT_REDIRECT` after `TX_COMMIT`.
2. **Which request?** Server-action POST completing with Next.js redirect handling; result navigation then presents the flash (`PRESENTED`). Not an intentional application 503 envelope.
3. **Source of “503”?** Browser-tool network misclassification of the successful redirect/action exchange (consistent with prior `eos-s06-mutation-503` packet: edge histogram had 200/303/499, zero 503).
4. **Silent client retry?** Not required for these four — durable audit `metadata.replayed: false` and UI showed Succeeded without duplicate bindings.
5. **Successful durable command ever represented by failure status?** Not by the application settlement path; Claude’s tool reported failure status while the server recorded success.
6. **Monitoring availability impact?** Application settlement and `platform_audit` record SUCCESS/`NEXT_REDIRECT`. Availability monitors that key off genuine edge/app 5xx would **not** count these as unavailable failures. Tool-only 503 labels would only pollute browser-side instrumentation if ingested as truth.

### Synthetic status capture (one mutation)

Local Playwright harness `e2e/s06-successful-mutation-status.spec.ts` (one propose):

- Mutation `next-action` POST → **HTTP 303**
- Follow-on seating navigation → **HTTP 200**
- Assertion: status ∉ {503}; status ∈ {200,303,302,307,308}

**No application HTTP-status code change** — successful actions already return proper redirect success; preserving proof.

## 2. Visible keyboard focus

Claude observed `outline-style: none` and no meaningful ring on Activate/Withdraw binding controls.

Correction: explicit `.at-scope .button:focus-visible` / `button[type=submit]:focus-visible` treatment in `packages/design-system/src/atelier.css` — champagne outline (≥3px) + onyx/champagne box-shadow ring (not colour-alone), `:focus-visible` only.

Focused test: `e2e/s06-binding-focus-visible.spec.ts` — **pass**.

## 3. Conflict-identity wording

Prior carry-forward: possible mix of `conflictingEditionId` vs content-hash prefix.

Current contract used the edition UUID prefix without always labelling it as an edition (and without showing content hash separately). Labels clarified (logic unchanged):

- Refusal `publicMessage`: “conflicting governing **rule edition** {8-char}”
- UI: “rule **edition** {id} · **content hash** {prefix}” when hash available
- Projection adds `hardConflictContentHashPrefix` from the conflicting ACTIVE edition’s `contentHash`

Focused test: `test/s06-hard-conflict-identity-copy.test.ts` — **pass**.

## Focused validation

| Gate | Result |
|------|--------|
| `s06-successful-mutation-status.spec.ts` | pass (POST 303) |
| `s06-binding-focus-visible.spec.ts` | pass |
| `s06-hard-conflict-identity-copy.test.ts` | pass |
| Related conflict refusal copy + design-system contrast | pass |
| event-os / shared-platform / design-system `tsc --noEmit` | pass |
| `git diff --check` | pass |

## Deployment / CI / protected surfaces

Filled after commit + event-os deploy + CI billing check.

## Explicit non-acceptance

EOS-S06 **not** accepted. EOS-S07 **not** started. Control Tower **not** deployed. Protected Untitled / abandoned S076 scripts **untouched**.
