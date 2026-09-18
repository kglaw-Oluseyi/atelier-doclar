# Legacy recovery manifest

Redacted operational identifiers only. No secrets, tokens, passwords, connection strings, or database content.

Created: 2026-09-18
Repository: https://github.com/kglaw-Oluseyi/atelier-doclar
Product: Event OS
Railway project: `atelier-doclar` (`c1c937b7-2660-4fc2-8257-c08bd6346658`)
Railway environment: `production` (`6d70f804-d3c7-4255-88c3-cc86531251ef`)

## Archived Git identity

| Item | Value |
| --- | --- |
| Archived commit | `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786` |
| Tree | `8a0c0d55d6902eaef70b5aad0c2f1269cfa5cc0e` |
| Tracked-file list SHA-256 | `e68aabc9467075fcb0401a472b8265941f9f582326a2c3ff8a8a2b30e01fad9f` |
| Tracked files | 2299 |
| Reachable commits | 525, root `f7abb431be9a15ab730b3fdd16baa8e83776c170` |
| Legacy branch | `legacy/event-os-s01-s06a-pre-rebuild` |
| Annotated tag | `legacy-event-os-pre-rebuild-2026-09-18` |
| Tag object | `fdb20e2be541f8ce9dd5fa097fb316a26afadb4a` |

The branch and tag both resolve to the archived commit. History was not rewritten.

Branch ruleset `23681713` blocks force-push and deletion of `legacy/event-os-s01-s06a-pre-rebuild`. Tag ruleset `23681724` blocks force-update and deletion of `legacy-event-os-pre-rebuild-2026-09-18`. Neither ruleset has a bypass actor.

## Railway Event OS at archive time

| Item | Value |
| --- | --- |
| Service | `event-os` (`31c25514-ef57-43c6-97ff-49fc6dd367c5`) |
| Service instance | `b01f45a0-61d7-46b7-b1d2-8426f47baa97` |
| Deployment ID | `6bd04814-19f8-4ec3-b625-31c558fbfe5f` |
| Deployment status | `SUCCESS` |
| Deployment created | `2026-09-18T20:30:49.080Z` |
| Source SHA | `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786` |
| Public URL | `https://event-os-production-bc8d.up.railway.app` |
| Persistence | `POSTGRES` |
| Migration state | `APPLIED` |
| `productionAuthorised` | `false` |
| Source repo | `kglaw-Oluseyi/atelier-doclar` |
| Watch patterns | `/__CONTROLLED_DEPLOY_ONLY__/**` |

That watch pattern is the deployment guard. Railway skips a deployment when a push does not change a matching path. The clean baseline does not contain `/__CONTROLLED_DEPLOY_ONLY__/**`.

## Other services, identification only

These were not modified.

| Service | Service ID | Deployment ID | Source |
| --- | --- | --- | --- |
| `control-tower` | `17dfb657-71ee-451b-acff-c3f0a18067b2` | `64642db9-db60-497b-a207-3d5d92fbcae3` | Git repo `kglaw-Oluseyi/atelier-doclar`, commit `e58a90889bd0ea16d3197e92dffeb82a02d5cb05`, watch patterns `/__CONTROLLED_DEPLOY_ONLY__/**` |
| `solver-worker` | `32f09234-9295-4a6c-8b8d-952d61d08706` | `57b5c9fb-4538-44ef-ad90-7d731a7db948` | Image `ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-worker-8c8d922` |
| `Postgres` | `5d86579b-6b66-4178-96b8-b66e1f7755a3` | `042b7911-c87e-4458-82da-68f61cfaf4b9` | Image `ghcr.io/railwayapp-templates/postgres-ssl:18` |

Control Tower public URL: `https://control-tower-production-dbc4.up.railway.app`.

The only GitHub deployment trigger in this project is `917d7ecf-f89d-4686-b4dd-0bfb787eeaa2`, attached to Control Tower, branch `main`. Control Tower still has the watch-pattern guard above.

## Database backup

No migration, truncate, reseed, or other database mutation was performed. The Postgres deployment ID above did not change when the backup was created.

| Item | Value |
| --- | --- |
| Mechanism | Railway on-demand volume backup (`railway postgres pitr backup create`) |
| Backup ID | `3eb24d3d-3a09-4b21-ae2d-e75ae6224ef3` |
| Name | `legacy-freeze-pre-rebuild-2026-09-18` |
| Created | `2026-09-18T20:53:16.366Z` |
| External snapshot | `vs_1789764796326_9vssv9fr6ckoy0ik` |
| Workflow | `createVolumeInstanceBackup/ca450a7c-ac33-4a23-856a-d3e0bfb66e23` |
| Referenced size | 1204 MB |
| Live volume size at backup | 1204.38784 MB |
| Incremental exclusive size | 0 MB, expected for a new copy-on-write snapshot that still shares blocks with the live volume |
| Locked | yes |
| Expires | no (`expiresAt` null) |
| Volume | `postgres-volume` (`9c9f1b2a-6bb3-4574-8817-62401d5642fb`) |
| Mount | `/var/lib/postgresql/data` |
| Database name | `railway` |
| Service | `Postgres` (`5d86579b-6b66-4178-96b8-b66e1f7755a3`) |
| Verification | Backup is listed, locked, and its referenced size matches the live volume. The live Postgres deployment remained `042b7911-c87e-4458-82da-68f61cfaf4b9`. |

This backup file is not in Git.

## Storage and integration names

- Bucket: `event-os-layout-assets` (`fa78e87f-a8e8-4dcf-af33-f296f9833588`)
- Volume: `postgres-volume`
- Event OS and Control Tower Git source: `kglaw-Oluseyi/atelier-doclar`
- Solver worker image repository: `ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker`

## Environment variable names

Names only. Values are not recorded.

Event OS: `DATABASE_URL`, `EVENT_OS_ACCESS_TOKEN`, `EVENT_OS_ALLOW_FIXTURES`, `EVENT_OS_ATELIER_LINK_PEPPER`, `EVENT_OS_ATELIER_SESSION_SECRET`, `EVENT_OS_COOKIE_SECURE`, `EVENT_OS_DOCS_HEAD`, `EVENT_OS_GIT_SHA`, `EVENT_OS_LAYOUT_ASSET_ACCESS_KEY`, `EVENT_OS_LAYOUT_ASSET_BUCKET`, `EVENT_OS_LAYOUT_ASSET_ENDPOINT`, `EVENT_OS_LAYOUT_ASSET_REGION`, `EVENT_OS_LAYOUT_ASSET_SCANNER`, `EVENT_OS_LAYOUT_ASSET_SECRET_KEY`, `EVENT_OS_LAYOUT_ASSET_STORE_PROVIDER`, `EVENT_OS_LAYOUT_ASSET_URL_STYLE`, `EVENT_OS_LAYOUT_EXPORT_ENABLED`, `EVENT_OS_RSVP_KEY_ID`, `EVENT_OS_RSVP_PEPPER`, `EVENT_OS_RSVP_SESSION_SECRET`, `EVENT_OS_SESSION_SECRET`, `EVENT_OS_SESSION_TTL_SECONDS`, `EVENT_OS_VENDOR_PEPPER`, `EVENT_OS_VENDOR_SESSION_SECRET`, `NODE_ENV`, `RAILPACK_BUILD_CMD`, `RAILPACK_START_CMD`, `RAILWAY_ENVIRONMENT`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_PROJECT_ID`, `RAILWAY_PROJECT_NAME`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_SERVICE_CONTROL_TOWER_URL`, `RAILWAY_SERVICE_EVENT_OS_URL`, `RAILWAY_SERVICE_ID`, `RAILWAY_SERVICE_NAME`, `RAILWAY_STATIC_URL`.

Postgres: `DATABASE_URL`, `PGDATA`, `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, `RAILWAY_ENVIRONMENT`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_PROJECT_ID`, `RAILWAY_PROJECT_NAME`, `RAILWAY_SERVICE_CONTROL_TOWER_URL`, `RAILWAY_SERVICE_EVENT_OS_URL`, `RAILWAY_SERVICE_ID`, `RAILWAY_SERVICE_NAME`, `RAILWAY_VOLUME_ID`, `RAILWAY_VOLUME_MOUNT_PATH`, `RAILWAY_VOLUME_NAME`, `SSL_CERT_DAYS`.

## Git recovery

Do not force-push. Do not delete the legacy branch or tag.

```bash
git fetch origin legacy/event-os-s01-s06a-pre-rebuild
git fetch origin tag legacy-event-os-pre-rebuild-2026-09-18
git rev-parse origin/legacy/event-os-s01-s06a-pre-rebuild
git rev-parse legacy-event-os-pre-rebuild-2026-09-18^{}
```

Both commands must print `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786`.

Inspect the archived tree in a new worktree:

```bash
git worktree add /path/to/event-os-legacy origin/legacy/event-os-s01-s06a-pre-rebuild
```

To put the archived files back on `main` without rewriting history, revert the rebuild-baseline commit (the commit that added this file and removed the legacy working tree):

```bash
git revert --no-edit <rebuild-baseline-commit>
git push origin HEAD:main
```

That revert is a normal commit. It is not authorised by this manifest and must not be performed unless the CEO asks for it.

## Railway rollback

Do not deploy the clean baseline. Do not run `railway up` from the rebuild tree. Do not change watch patterns.

If Event OS is no longer deployment `6bd04814-19f8-4ec3-b625-31c558fbfe5f` at SHA `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786`, roll that deployment back with Railway's deployment rollback. The argument is the deployment to return to:

```bash
railway api 'mutation($id: String!) { deploymentRollback(id: $id) }' --raw-var id=6bd04814-19f8-4ec3-b625-31c558fbfe5f
```

Do not use `railway deployment redeploy --from-source`. That would build the current Git source. Do not roll back, redeploy, restart, or remove Control Tower, solver-worker, or Postgres.

After rollback, `https://event-os-production-bc8d.up.railway.app/api/health/live` must report `deployedSha` `2033ea7c39f8ffaf1237048b0c8eb7268e9aa786` and `productionAuthorised` `false`.

## Database restore

Do not restore this backup onto the live database unless the CEO explicitly authorises a restore. Railway restore stages a volume swap and then deploys. Restoring also removes backups newer than the selected snapshot.

Reference only:

```bash
railway postgres pitr backup restore \
  --service Postgres \
  --environment production \
  --project c1c937b7-2660-4fc2-8257-c08bd6346658 \
  3eb24d3d-3a09-4b21-ae2d-e75ae6224ef3
```

The live database remains the original volume `postgres-volume` (`9c9f1b2a-6bb3-4574-8817-62401d5642fb`) until that command is deliberately run.
