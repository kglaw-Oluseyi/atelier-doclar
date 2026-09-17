# M6C — Role-session provisioning (redacted)

**Disposition:** `ROLE SESSIONS READY`  
**Issued (UTC):** `2026-09-17T17:37:01Z`  
**Auth mechanism:** Existing approved non-production fixture authentication (`NON_PRODUCTION_FIXTURE` named staff email + Railway `EVENT_OS_ACCESS_TOKEN`).  
**No code change. No redeploy. No role-assignment mutation. No impersonation / verify-as bypass used for Claude sessions.**

## Server-side identities

| Display name | Account ID (person) | Role | Event scope for M6C seating | Assignment ID |
| --- | --- | --- | --- | --- |
| James Whitfield | `00000000-0000-4000-8000-000000000043` | Planner | Event `92909476-d3f9-43f1-a5f7-7e1a83c92fbd` | `6d197a55-a4ca-4333-afef-e884d5a1f2b2` |
| Amara Okonkwo | `00000000-0000-4000-8000-000000000042` | Event Director | Event `92909476-d3f9-43f1-a5f7-7e1a83c92fbd` | `5d980015-e5e5-4a47-a282-45ff154c5fda` |
| Priya Nair | `00000000-0000-4000-8000-000000000045` | Read-only Auditor | Event `92909476-d3f9-43f1-a5f7-7e1a83c92fbd` (+ org-wide auditor assignment) | `c51d78fd-3604-4738-a738-eca15a19f2bc` |
| George Lawson | `00000000-0000-4000-8000-000000000041` | CEO | Organisation-wide (includes synthetic event) | `00000000-0000-4000-8000-000000000061` |

All four persons: `ACTIVE`.  
Live browser proof: each email signed in independently, displayed the correct name, opened `/app/events/92909476-…/seating` without seating forbidden flash.

## Access method

- Method: fixture staff sign-in at `/sign-in` (email + access token).
- Token source: Railway service `event-os` variable `EVENT_OS_ACCESS_TOKEN` (already present; not rotated in this step).
- Token fingerprint (sha256/12): `1927225f4b5a`
- Fixtures allowed: `EVENT_OS_ALLOW_FIXTURES=1`
- Session TTL: `7200` seconds (2 hours from each successful sign-in)
- Operator one-time materialisation: local file `/tmp/m6c-role-access-ONCE.txt` mode `0600` (not in repo; delete after copy)

## Scope honesty

Planner / Director / Auditor have **dedicated ACTIVE grants** on synthetic event `92909476-…`.  
They also retain pre-existing grants on other synthetic fixture events from earlier work.  
Exclusive single-event lock would require assignment changes, which this milestone forbids.

## Expiry / revocation procedure

1. After Claude finishes: sign out every Chrome profile used (`Sign out` in Staff nav).
2. Rotate Railway `EVENT_OS_ACCESS_TOKEN` on `event-os` to a new random value.
3. Confirm autodeploy remains disabled; variable rotation alone does not require a code redeploy for token invalidation on next sign-in (existing sessions expire within TTL or on logout).
4. Delete any local copies of the token file (`rm -P /tmp/m6c-role-access-ONCE.txt` if still present).
5. Do not commit, log, or paste the token into evidence or LLM prompts.

## Permissions expected (unchanged catalog)

- Planner: seating view / run / submit / evaluate (mutations allowed where product surfaces expose them)
- Event Director: seating view / approve
- CEO: seating view / publish (CP-SAT adopt)
- Auditor: seating view only (no mutation controls)
