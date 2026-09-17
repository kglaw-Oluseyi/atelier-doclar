# M6B build-blocker remediation

UTC: 2026-09-17

## Failed attempt
- Failed deployment: `c5fa323c-b5e3-4df8-966a-205d39374526`
- Source: `0844e78c8c897447de8eb88687e906f104bf5fd3`
- Failure stage: Railpack / `next build` (before migrations, healthcheck, activation)

## Root cause
Client component `apps/event-os/src/components/cpsat-run-status-panel.tsx` runtime-imported `cancelConfirmCopy` / `keepBestConfirmCopy` from the shared-platform root barrel (`packages/shared-platform/src/index.ts`), which transitively pulled Node-only modules (`node:assert/strict`, `node:async_hooks`, `node:crypto`, `node:zlib`) into the browser graph.

## Affected client inventory (shared-platform imports)
| File | Before | After |
|---|---|---|
| `cpsat-run-status-panel.tsx` | runtime + type from root barrel | `@maison-doclar/shared-platform/cpsat-client` |
| `cpsat-candidate-review-panel.tsx` | type-only root barrel | `cpsat-client` |
| `cpsat-run-lifecycle-poller.tsx` | none | unchanged |
| `cpsat-worker-unavailable-panel.tsx` | none | unchanged |
| `event-venue-workspace.tsx` | type-only root barrel | `client-types` |
| `host-atelier-view.tsx` | type-only root barrel | `client-types` |
| `layout-assurance-workspace.tsx` | type-only root barrel | `client-types` |
| `layout-setup-workspace.tsx` | type-only root barrel | `client-types` |
| `layout-studio-workspace.tsx` | type-only root barrel | `client-types` |
| `protection-mutation-form.tsx` | type-only root barrel | `client-types` |
| `venue-detail-workspace.tsx` | type-only root barrel | `client-types` |

## Fix commits
1. `211f9c08cb5e55e785395f4c535fc44f2f2d76da` — `fix(event-os): isolate cpsat client bundle from server runtime`
2. `9746b1749e579a720c4f720c8f578d27166d0d39` — `fix(shared-platform): export capacity1000RuleProfile for production build` (latent barrel export mismatch blocking Railway typecheck)

## Active deployment after remediation
- Deployment ID: `7ec56f81-f718-4abb-91fc-cfec9352fcbd`
- Source / application / deployed SHA: `9746b1749e579a720c4f720c8f578d27166d0d39`
- Status: SUCCESS
- Health: ready=true, POSTGRES, migrationStatus=APPLIED, productionAuthorised=false
- Migrations now include `011`–`016`
- Autodeploy: disabled
- Providers: inactive
- Previous SUCCESS retained for rollback: `3ea10e66-3b25-43dd-bf0c-fbb1974d012f` (df6d6a6)

## Explicit non-actions
- No Webpack `node:` polyfills
- No server authority / crypto / DB logic moved into browser components
- No Control Tower mutation
- No worker service created yet

## M6B continuation point
Resume at **§14 Worker database role** (then create/deploy `solver-worker`, synthetic journeys, frontend readiness, rollback drill, evidence commit).
