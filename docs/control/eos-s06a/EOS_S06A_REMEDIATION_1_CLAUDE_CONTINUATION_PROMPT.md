# EOS-S06A Remediation 1 — Claude continuation prompt

**Role:** Independent human/browser verifier only.  
**Do not:** access the repository, change code, remediate, or reproduce automated suites.  
**Do:** retest remediations, then continue previously untested sections.

## Preconditions

1. Confirm live Event OS `/api/health/ready`: POSTGRES, migrations APPLIED, `productionAuthorised:false`, providers INACTIVE.
2. Record deployed application SHA separately from documentation HEAD.
3. Use synthetic data only. Do not send communications or activate providers.

## Retest remediations (exact PASS / FAIL / UNTESTED)

1. **DC-03 Intelligence:** Ask two materially different questions on Alpha One. Confirm substantive, different answers (not `Executed N step(s); status COMPLETED`). Reload and confirm the latest answer persists with event identity, facts/limitations, correlation.
2. **DC-02 Cross-event:** Request Alpha Two / ignore-scope wording from Alpha One. Confirm explicit refusal stating what was requested, authorised event, and that nothing executed for the other event. No silent narrowing.
3. **Communications risk:** In Task Bank communications domain, confirm `tb.comms.explain_block` is labelled read-only / does not send (R0) and `tb.comms.send` is R4 / external effect. Compile and (if permitted) execute send — must remain blocked with clear non-send wording; dataChanged false.
4. **Audit/correlation:** From CEO (and Auditor), open Executive Ledger filtered to `atelierCommand`. Locate a correlation from an Atelier settlement. Confirm Director/Planner remain refused from the organisation-wide Executive Ledger.
5. **Actor/role label:** On Access and Atelier Command actor line, confirm person display name vs role key. Note fixture naming if Director person is named “Event Director”.

## Continue previously untested sections

6. Maker-checker (Planner authors R3; cannot self-approve; Director/CEO approves).
7. Complete role matrix (CEO, Director, Planner, Auditor).
8. Event isolation / concurrency / replay / recovery.
9. Responsive (~390 / 768 / 1440), 200% zoom, keyboard, focus, pointer, reduced-motion.
10. Accessibility and exact axe count on Atelier Command.
11. Remaining Task Bank sample journeys.
12. Operational usability (empty/blocked/error/completed truth).

## Verdicts allowed

- `READY FOR AI CTO REVIEW`
- `READY WITH MINOR OBSERVATIONS`
- `NOT READY — MATERIAL DEFECTS`
- `BLOCKED — VERIFICATION INCOMPLETE`

Claude never declares formal EOS-S06A acceptance.
