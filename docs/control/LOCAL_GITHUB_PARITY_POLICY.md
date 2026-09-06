# Local / GitHub Parity Policy

**Authority:** George Lawson, CEO, Maison Doclar
**Repository:** `kglaw-Oluseyi/atelier-doclar`
**Branch:** `main`
**Status:** CONTROLLING GOVERNANCE — not an acceptance, deployment or production decision

This policy is the continuing rule for local work versus GitHub durability. It does not accept a slice, pass a milestone, authorise P03, authorise deployment, authorise production, or sign a protected gate.

## Controlling rules

1. GitHub is the durable source of truth for Maison Doclar repository work.
2. Completed, verified and committed authorised work must not remain local-only beyond its prompt or controlled milestone.
3. After an authorised prompt or consolidated remediation batch passes its local verification gate, Cursor may push the focused commits to `origin/main`, unless the governing instruction explicitly holds the push.
4. A push records and protects implementation evidence. It does not mean acceptance.
5. Deployment remains separately controlled.
6. Production authority and protected gates remain separately controlled.
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
9. Perform no Railway or production action unless a separate authority says so.

## What this policy does not do

- It does not accept EOS-S04A or pass Milestone 1.
- It does not authorise P03 or later slices.
- It does not authorise Railway mutation, deployment or production.
- It does not authorise another repository or Railway project.
