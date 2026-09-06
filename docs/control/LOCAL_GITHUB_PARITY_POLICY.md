# Local / GitHub Parity Policy

**Authority:** George Lawson, CEO, Maison Doclar
**Repository:** `kglaw-Oluseyi/atelier-doclar`
**Branch:** `main`
**Status:** CONTROLLING GOVERNANCE — not an acceptance, deployment or production decision

This policy is the continuing rule for local work versus GitHub durability. It does not accept a slice, pass a milestone, authorise production operations, or sign a protected gate.

## Supersession — deploy-by-default (6 September 2026)

**Former restriction:** Deployment remained separately controlled. Push procedure step 9 forbade Railway or production action unless a separate authority said so. The policy stated it did not authorise Railway mutation, deployment or production.

**Status:** SUPERSEDED for ordinary non-force GitHub push and deployment of affected services in Railway project `atelier-doclar`.

**Current policy:** `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

**Safeguards retained:** real client/guest data, external communications, payments, public access beyond the authorised audience, force-push, history rewrite, destructive database resets, other repositories or Railway projects, protected-gate signatures, and `productionAuthorised` remain gated. Remote divergence still stops the executor. Secrets must not be committed.

## Controlling rules

1. GitHub is the durable source of truth for Maison Doclar repository work.
2. Completed, verified and committed authorised work must not remain local-only beyond its prompt or controlled milestone.
3. After an authorised prompt or consolidated remediation batch passes its local verification gate, Cursor may push the focused commits to `origin/main`, unless the governing instruction explicitly holds the push.
4. A push records and protects implementation evidence. It does not mean acceptance.
5. Deployment of affected `atelier-doclar` services follows `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` after verification. It is not production-operations authorisation.
6. Production authority and protected gates remain separately controlled. `productionAuthorised` remains false until a protected production gate is signed.
7. Before every push, Cursor must fetch and compare remote state.
8. Cursor must stop on remote divergence rather than merge, rebase or overwrite autonomously.
9. No force-push, commit amendment or history rewriting is permitted.
10. Only deliberate repository artifacts may be tracked.
11. Secrets, real personal data, `.env` files, caches, dependencies, generated build output and temporary evidence must not be committed.
12. Every push must end with verification that local `HEAD`, `origin/main` and the GitHub remote branch resolve to the same full SHA.

## Work-state vocabulary

Every implementation ledger must distinguish these states. They are never synonyms.

| State | Meaning |
|-------|---------|
| Implemented | Code or documents exist in a commit. |
| Locally verified | Required local verification commands passed on that commit or batch. |
| Pushed | The commit is on `origin/main` and GitHub `main` at the same SHA. |
| Independently reviewed | An authorised independent reviewer has examined the pushed evidence. |
| Accepted | A formal acceptance record exists for that slice or milestone. |
| Deployed | An authorised deployment action has placed the work in a named environment. |
| Production authorised | A protected production gate has been signed. `productionAuthorised` remains false until that happens. |

## Push procedure

1. Confirm repository `kglaw-Oluseyi/atelier-doclar` and branch `main`.
2. `git fetch origin main` and compare `HEAD` to `origin/main`.
3. Stop if the remote has moved, the branch is wrong, the worktree has unexplained changes, or any file may contain secrets or real personal data.
4. Do not pull, merge, rebase, reset, amend or force-push.
5. Inventory untracked files. Commit only category A (deliberate repository artifacts). Keep generated evidence local. Do not commit ignored dependencies, caches or build output.
6. Run the repository verification gate required by the governing prompt.
7. If and only if those checks pass, `git push origin main` with no force flags, extra branches, tags or releases.
8. Fetch again and confirm `local HEAD == local origin/main == GitHub main`.
9. After verification and push, deploy affected services in Railway project `atelier-doclar` under the deploy-by-default policy. Do not force-push, rewrite history, or touch another Railway project.

## What this policy does not do

- It does not accept a slice or pass a milestone by itself.
- It does not authorise real client operations or sign a protected gate.
- Railway mutation of other projects remains forbidden. Deployment inside `atelier-doclar` is standing-authorised after verification.
- It does not authorise another repository.
