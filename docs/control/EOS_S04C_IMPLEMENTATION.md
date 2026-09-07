# EOS-S04C Implementation Record

**Slice ID:** `EOS-S04C`  
**Prompt Control ID:** `MD-PR-S020`  
**Status:** `IN_REVIEW / NOT READY`
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `9a79a443b7f08e727db12c9ea8dc4da8a557d8c0`

## Scope delivered

P00–P11: ratification, shared-platform contracts, additive Postgres migration `EOS-S04C-MERCHANDISE-COLLECTIONS-V1`, services, staff merchandise workspace, guest-access offers, separate vendor portal, ACA-S04C, Playwright evidence, and Event OS deploy to Railway project `atelier-doclar`.

EOS-S04D–F and EOS-S05 were not started. Control Tower was not a deploy target.

## Authority matrix (staff)

| Permission | CEO | Event Director | Planner | Auditor | Sysadmin |
|------------|-----|----------------|---------|---------|----------|
| `merch.*.view` / report / audit | yes | yes | view + routine manage | view / report / audit | no |
| collection / offer manage | yes | yes | yes | no | no |
| sponsor / vendor grant / exception review | yes | yes | no | no | no |
| cap measurement manage | yes | yes | no | no | no |

Vendor User is `VENDOR_CAPABILITY` on `/vendor`, not a staff role. Vendors cannot mutate Guest, Invitation, RSVP, Party, Credential or Attendance.

## Domain rules retained

- S03 invitation/RSVP, S04 communications, S04A guests/parties, S04B phases remain authoritative.
- Merchandise never creates invitation, attendance or phase eligibility.
- Household/party never substitutes for `guestId`.
- Cohorts target offers only; they do not merge identities.
- Only optional consented male-cap circumference in inches.
- Vendor commercial status is attributed evidence, never Maison Doclar payment truth.

## First-run verification

Workspace `pnpm typecheck`, `pnpm test`, `pnpm programme:validate` and `pnpm --filter @maison-doclar/event-os build` passed after product fixes (client-bundle `node:crypto` isolation; datetime-local → ISO). Playwright first-run failures were locator strict-mode assertions, not product defects; the suite then passed 3/3.

## Primary-journey remediation

Claude blocked acceptance on incomplete staff item/offer creation, RSVP-bound guest access, and a fixture vendor link. The merchandise studio now completes collection → item → audience preview → offer, issues merchandise-only guest grants on `/offers`, and issues/renews/revokes vendor assignments with accurate usability seals. Additive migration `EOS-S04C-MERCHANDISE-GUEST-GRANTS-V2`. Focused re-verification: `docs/control/EOS_S04C_FOCUSED_CLAUDE_REVERIFICATION.md`.

## Not accepted

This record does not accept EOS-S04C. Independent Claude-in-Chrome verification is `docs/control/EOS_S04C_CLAUDE_IN_CHROME_VERIFICATION.md`.
