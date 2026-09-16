# Claude-in-Chrome — EOS-S06C Independent Verification Prompt

**Copy-ready. Do not remediate. Do not accept. Return PASS / PASS WITH CONTROLLED OBSERVATIONS / FAIL / BLOCKED.**

## Identities

- Application SHA: `04d5607125e6806078a2b496665bf9fe11e57234`
- Deployment ID: `df909000-d78c-46c1-8b9d-798883546691`
- Deployment source SHA: `04d5607125e6806078a2b496665bf9fe11e57234`
- Documentation HEAD: `0a0be803f123e8326fb893db1e3562c724b70dd0` (intentional lag; do not conflate with application SHA)
- Git tip at pre-Claude closure: see latest evidence commit on `main` (docs/evidence only; application SHA remains `04d5607…`)
- Live URL: `https://event-os-production-bc8d.up.railway.app`
- `productionAuthorised`: false
- Providers / communications: inactive

### Exact CAP1000 fixture (verification target)

- Event ID: `add41e21-9618-44f9-896a-fecd54badca5`
- Event name: `[SYNTHETIC QUALIFICATION] EOS-S06C Exact CAP1000 2026-09-16`
- Event code: `S06C1KMU4LD5`
- Intake job ID: `28a5370a-6700-4ac0-88a8-a716026ed860`
- Job name: `S06C-1000-TYPICAL-EXACT-CAP1000`
- Edition: `1`
- Corpus: `S06C-1000-TYPICAL` / seed `eos-s06c-1000-typical-v1`
- Source hash: `67b0e96e98f81f9a4da7fe40eb44752cb68cdd5d9045a4ef3329e245535f68eb`
- Expected authoritative guests: **exactly 1,000**
- Expected reconciliation: before `0` / source `1000` / created `1000` / updated `0` / unchanged `0` / rejected `0` / after `1000` / duplicates `0` / missing `0` / chunks `4` / status `COMPLETED`
- Receipt ID: `29051b09-e31f-4962-b397-a1d08c057eb1`
- Prior automated browser closure: `BROWSER_CLOSURE_RESULTS.json` (PASS) — re-verify independently; do not treat automated PASS as acceptance

### Mixed-intake qualification event (context only — not CAP1000)

- Event ID: `af4a6b7e-0424-46d5-b9e5-d0a26845173e`
- Name: `[SYNTHETIC QUALIFICATION] EOS-S06C MIXED INTAKE 50+1000 — NOT EXACT CAP1000`
- Authoritative guests: **1,050** (50-row job + 1,000-row job on the same event)
- 50-row job: `a8c6a24d-bb7f-4f93-8689-7d48a673e549`
- Prior 1,000-row job on mixed event: `d39e9bde-9cdd-415c-b8eb-f586f6623bdc`
- Claim separation: “1,000-row intake qualified” ≠ “event contains exactly 1,000 guests”

## Hard exclusions

- Do **not** mutate CAP600 `053fa686-124e-49b3-b8a8-d0497c0a1668` (expect 600 guests / 63 cases / 600 capacity)
- Do **not** use old partial CAP1000 `3d212906-529e-4bd8-b13f-b0c2a24e5fba` (quarantined at 125 guests)
- Do **not** treat mixed event `af4a6b7e-0424-46d5-b9e5-d0a26845173e` (1,050 guests) as the exact CAP1000 fixture
- Do not start S06B / S06D / S07
- No credentials in chat
- No repository remediation

## Journeys (exact CAP1000 only)

1. Sign in through the normal staff adapter.
2. Find and open exact CAP1000 event `add41e21-…` / code `S06C1KMU4LD5`.
3. Open High Volume Guest Intake; confirm job `28a5370a-…` visible and `COMPLETED`.
4. Confirm source rows and reconciliation totals equal 1,000; guest total `0 → 1000`.
5. Confirm authoritative guest directory / API count is exactly 1,000.
6. Search representative guests near row 1, ~500, and 1000 (`Syn0` / `Syn499` / `Syn999` or emails `syn0` / `syn549` / `syn999` … `@example.test`).
7. Reload; confirm persistence.
8. Attempt replay / re-promote through supported UI/API; prove no duplicate guests and total remains 1,000.
9. Confirm Planner cannot approve their own submitted intake (no self-approve affordance on COMPLETED / maker path).
10. Confirm authorised Director can inspect approval/receipt.
11. Confirm Read-Only Auditor cannot mutate.
12. Confirm no indefinite pending state, blank terminal page, or redirect loop.
13. Check 360 / 768 / 1280 layouts; keyboard navigation and visible focus.
14. Confirm CAP600 still 600 and untouched; old partial CAP1000 still 125 quarantined; mixed event still 1,050.
15. Confirm `productionAuthorised:false` and providers inactive.
16. Confirm programme posture: EOS-S06C not yet accepted.

## Required return

Classification plus journey table (route, role, expected, observed, evidence). Preserve prior Gate 1 history; do not rewrite it. Do not claim EOS-S06C accepted.
