#!/bin/sh
set -eu
cd /app
node packages/foundation/node_modules/tsx/dist/cli.mjs packages/foundation/src/migrate.ts
exec pnpm --filter @maison-doclar/event-os start
