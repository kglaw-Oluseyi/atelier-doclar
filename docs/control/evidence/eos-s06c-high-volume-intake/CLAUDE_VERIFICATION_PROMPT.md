# Claude-in-Chrome — EOS-S06C Independent Verification Prompt

**Copy-ready. Do not remediate. Do not accept. Return PASS / PASS WITH CONTROLLED OBSERVATIONS / FAIL / BLOCKED.**

## Identities

- Application SHA: `04d5607125e6806078a2b496665bf9fe11e57234`
- Deployment ID: `df909000-d78c-46c1-8b9d-798883546691`
- Deployment source SHA: `04d5607125e6806078a2b496665bf9fe11e57234`
- Documentation HEAD: `0a0be803f123e8326fb893db1e3562c724b70dd0` (intentional lag; do not conflate with application SHA)
- Git HEAD at implementation tip: `04d5607125e6806078a2b496665bf9fe11e57234` (plus any later evidence-only commits)
- Synthetic S06C event ID: `af4a6b7e-0424-46d5-b9e5-d0a26845173e`
- Event name: `[SYNTHETIC QUALIFICATION] EOS-S06C High-Volume Intake 2026-09-16`
- Intake job ID (50-row): `a8c6a24d-bb7f-4f93-8689-7d48a673e549`
- Intake job ID (1000-row): `d39e9bde-9cdd-415c-b8eb-f586f6623bdc`
- Live URL: `https://event-os-production-bc8d.up.railway.app`
- `productionAuthorised`: false
- Providers / communications: inactive
- Prior automated live product intake: see `LIVE_FIXTURE_MANIFEST.json` (50 + 1000 rows COMPLETED; CAP1000 **awaiting independent verification**)

## Hard exclusions

- Do not mutate CAP600 `053fa686-124e-49b3-b8a8-d0497c0a1668`
- Do not use old partial CAP1000 `3d212906-529e-4bd8-b13f-b0c2a24e5fba`
- Do not start S06B / S06D / S07
- No credentials in chat
- No repository remediation

## Journeys

1. Discover the synthetic S06C qualification event (search conspicuous label / event ID above).
2. Open Guest directory → High-volume guest list intake; download CSV template.
3. Create a named intake; note immutable intake ID / edition (or open existing 50-row / 1000-row jobs).
4. Upload a prepared synthetic CSV (small browser-verifiable set first) if creating a fresh job.
5. Review mapping; confirm destinations.
6. Observe validation totals (valid/warning/invalid/duplicate).
7. Correct at least one representative row decision when review is required.
8. Submit as maker; sign in as a different authorised checker and approve (self-approve must fail).
9. Promote; observe honest progress (phase, counts, last update, safe-to-leave).
10. Confirm reconciliation receipt arithmetic.
11. Reload page; confirm persistence.
12. Replay advance; confirm no duplicate guests.
13. Confirm Auditor / restricted role cannot mutate.
14. Confirm ordinary guest-directory visibility of promoted guests.
15. Check 360 / 768 / 1280 layouts, keyboard focus, status announcements.
16. Confirm no provider communication occurred.
17. Confirm programme posture: production unauthorised; S06C not yet accepted.

## Required return

Classification plus journey table (route, role, expected, observed, evidence). Preserve prior Gate 1 history; do not rewrite it.
