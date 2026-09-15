# EOS-S06 — Security remediation 3 (bounded)

**Prompt:** Three-issue Event OS security/UX pass (Audit Executive Ledger, Executive Command home card, repeated export #418)  
**Not acceptance.** EOS-S06 remains unaccepted. CI mandatory. EOS-S07 unstarted.  
**Prior:** [`../eos-s06-claude-remediation-2/MANIFEST.md`](../eos-s06-claude-remediation-2/MANIFEST.md)

## Identities

| Role | SHA / ID |
|------|----------|
| Start docs HEAD | `212548ef…` |
| Start deployed Event OS | `9497f543ebfb7289170a3acc4d1ab69f20281692` |
| Application commit | _(filled after push)_ |
| Deployed Event OS | _(filled after Railway SUCCESS)_ |
| Control Tower | **not redeployed** |

## Root causes and corrections

### 1. Event Director Audit access (blocker)

- **Cause:** `/app/admin/audit` and Audit nav treated `platform.audit.read_operational` (Event Director remit) as sufficient for the org-wide Executive Ledger.
- **Fix:** Gate page + nav on `platform.audit.read_all` only, mirroring Access’s `platform.access.administer` pattern. Refuse before `searchAudit`. CEO/Auditor retain access.

### 2. Executive Event Command home card (minor)

- **Cause:** Home always rendered the Executive Event Command link; destination correctly used `executiveCommand.view`.
- **Fix:** Same `executiveCommand.view` capability controls the home card (`data-testid="home-executive-command"`).

### 3. Repeated export React #418 (minor)

- **Cause:** Export form used client `IdempotencyField` (null→UUID after mount). Identical READY replay navigations could remount/reuse that client field against SSR HTML and report hydration #418.
- **Fix:** Server-mint `idempotencyKey` on the export Envelope; remount form keyed by action result; ISO-stable export list sort; REPLAYED copy states no new export / READY reused.

## Focused gates

| Gate | Result |
|------|--------|
| `test/s06-security-remediation-audit.test.ts` + copy DEF-04 | pass |
| Playwright DEF-04 / CEO-Auditor Audit + Command visibility | pass |
| Playwright identical export resubmit (source-gated; unit READY-reuse always) | pass |
| `seating-v2-command-path` READY export replay assertion | pass |
| event-os + shared-platform typecheck | pass |
| `git diff --check` | pass |

## Explicit non-acceptance

**EOS-S06 remains unaccepted. EOS-S07 remains unstarted.** Control Tower untouched. Protected files untouched.
