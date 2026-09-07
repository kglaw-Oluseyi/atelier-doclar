# EOS-S04C one-journey Claude-in-Chrome check — guest-access renewal conflict

**Authority:** `MD-PR-S020`. Claude verifies. Claude does not accept EOS-S04C.
**Mode:** Single journey only. Guest-access renewal false-success remediation.
**Railway project:** `atelier-doclar` only. Service: `event-os` only.
**Production:** `productionAuthorised` remains `false`.

Do not start EOS-S04D, EOS-S04E, EOS-S04F or EOS-S05.
Do not repeat vendor lifecycle, roles, consent, Academy, responsive, merchandise creation, or other passed journeys.
Do not collect payments. Do not send email, WhatsApp or SMS.

## 1. Deployment gate

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `productionAuthorised`.
3. `deployedSha` must equal `origin/main` of `kglaw-Oluseyi/atelier-doclar`.
4. Persistence must be `POSTGRES`. Migrations must be `APPLIED`. `productionAuthorised` must be `false`.
5. If any gate fails, verdict is `BLOCKED`.

Merchandise workspace: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/merchandise`

Staff token: Railway `EVENT_OS_ACCESS_TOKEN`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| Event Director | `director@maison-doclar.test` |

## 2. Two-tab guest-access renewal

Sign in as Event Director. Open private guest access on the merchandise workspace. Confirm an active grant with a visible expiry and version.

Open the same merchandise record in a second tab so both tabs hold the same grant version.

**Tab A (winner):** renew to a future expiry A. Confirm success. Note the durable winning expiry and that a usable link may be shown to the winner only.

**Tab B (loser):** without reloading, submit a **different** future expiry B against the previous version.

Expect on tab B:

- a visible `role="alert"` conflict summary, focused
- plain statement that the record changed elsewhere, the attempted renewal was not saved, and durable data did not change
- no success copy
- no newly issued or revealed access link
- expiry B is not presented as current
- mutation controls locked
- exactly one `Reload the current record` action

Reload on tab B. The conflict banner must disappear. The durable winning expiry/version from tab A must show. Controls must unlock. The existing valid grant must remain. A subsequent valid renewal from the reloaded record must work.

Inspect staff-visible audit. The stale tab B attempt must be recorded as **FAILED**, not successful. Do not treat the audit ledger as the only way to learn that tab B failed; the conflict UI must have already said so.

## Verdict language

Claude verifies. Claude does not accept EOS-S04C.  
EOS-S04D–F and EOS-S05 remain untouched.
