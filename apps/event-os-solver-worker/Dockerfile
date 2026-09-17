# syntax=docker/dockerfile:1.7
# event-os-solver-worker — Milestone 5/5A hardened production image
# No public domain, no listening port instruction, non-root, hash-pinned OR-Tools, no test fixtures.
#
# Build from a clean worktree of the implementation commit (repository root):
#   docker build --platform linux/amd64 \
#     -f apps/event-os-solver-worker/Dockerfile \
#     --build-context worker=apps/event-os-solver-worker \
#     --build-context platform=packages/shared-platform \
#     --build-arg SOURCE_SHA=<full-sha> \
#     -t event-os-solver-worker:candidate-<shortSHA> \
#     apps/event-os-solver-worker

ARG PYTHON_IMAGE=python:3.12.14-slim-bookworm@sha256:9c47360a2a0355e2da18516d0b1c2126ec22c195d2185e97347c9d98398c5bef
ARG NODE_VERSION=20.19.0
ARG NODE_TARBALL_SHA256=b4e336584d62abefad31baecff7af167268be9bb7dd11f1297112e6eed3ca0d5

FROM ${PYTHON_IMAGE} AS python-deps
WORKDIR /opt/solver-python
COPY --from=worker python/requirements.linux.hashes.txt ./requirements.txt
RUN pip install --no-cache-dir --require-hashes -r requirements.txt \
  && python -c "import ortools,sys,platform; print(ortools.__version__, sys.version, platform.machine())"

FROM ${PYTHON_IMAGE} AS node-bundle
ARG NODE_VERSION
ARG NODE_TARBALL_SHA256
ENV NODE_VERSION=${NODE_VERSION}
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl xz-utils; \
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz; \
  echo "${NODE_TARBALL_SHA256}  /tmp/node.tar.xz" | sha256sum -c -; \
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1; \
  rm -f /tmp/node.tar.xz; \
  apt-get purge -y curl xz-utils; \
  apt-get autoremove -y; \
  rm -rf /var/lib/apt/lists/*
WORKDIR /bundle
COPY --from=worker package.json tsconfig.json ./
COPY --from=worker src ./src
COPY --from=platform package.json /bundle/vendor/shared-platform/package.json
COPY --from=platform src /bundle/vendor/shared-platform/src
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); p.dependencies['@maison-doclar/shared-platform']='file:./vendor/shared-platform'; fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\\n');" \
  && npm install --no-fund --no-audit \
  && npx esbuild src/supervisor.ts --bundle --platform=node --format=esm --outfile=dist/supervisor.js --external:pg \
  && test -f dist/supervisor.js \
  && node -e "const fs=require('fs'); fs.writeFileSync('package.runtime.json', JSON.stringify({name:'@maison-doclar/event-os-solver-worker',private:true,type:'module',dependencies:{pg:'^8.23.0'}},null,2)+'\\n');"

FROM ${PYTHON_IMAGE} AS runtime
ARG NODE_VERSION
ARG NODE_TARBALL_SHA256
ARG SOURCE_SHA=unknown
ARG MODEL_VERSION=cpsat-model-v1
ARG DEPENDENCY_IDENTITY=ortools-9.15.6755
ENV NODE_VERSION=${NODE_VERSION}

# Node runtime only — purge curl/xz after install; no compiler toolchain retained.
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl xz-utils; \
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz; \
  echo "${NODE_TARBALL_SHA256}  /tmp/node.tar.xz" | sha256sum -c -; \
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1; \
  rm -f /tmp/node.tar.xz; \
  node --version; \
  npm --version; \
  apt-get purge -y curl xz-utils; \
  apt-get autoremove -y; \
  rm -rf /var/lib/apt/lists/*; \
  rm -f /usr/bin/curl /usr/local/bin/curl /bin/curl; \
  hash -r; \
  if command -v gcc >/dev/null 2>&1; then echo "gcc_present" >&2; exit 1; fi; \
  if command -v git >/dev/null 2>&1; then echo "git_present" >&2; exit 1; fi; \
  if command -v curl >/dev/null 2>&1; then echo "curl_present" >&2; exit 1; fi; \
  if command -v wget >/dev/null 2>&1; then echo "wget_present" >&2; exit 1; fi

COPY --from=python-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

WORKDIR /app
COPY --from=node-bundle /bundle/package.runtime.json ./package.json
COPY --from=node-bundle /bundle/dist/supervisor.js ./dist/supervisor.js
# Install runtime Node deps, then remove npm/npx/corepack so the toolchain is absent from the final image.
RUN npm install --omit=dev --no-fund --no-audit \
  && npm cache clean --force \
  && test -d /app/node_modules/pg \
  && test ! -d /app/node_modules/tsx \
  && test ! -d /app/node_modules/esbuild \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  && if command -v npm >/dev/null 2>&1; then echo "npm_present" >&2; exit 1; fi \
  && if command -v npx >/dev/null 2>&1; then echo "npx_present" >&2; exit 1; fi \
  && apt-get update \
  && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=worker python ./python
COPY --from=worker schemas ./schemas

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin solver \
  && mkdir -p /tmp/solver \
  && chown -R solver:solver /app /tmp/solver \
  && test ! -f /app/python/fake_malformed_child.py \
  && test ! -f /app/python/crash_child.py \
  && test ! -d /app/test-only \
  && test ! -f /app/test-only/keep_best_timing_child.py \
  && test ! -d /app/test \
  && test ! -d /app/scripts \
  && test ! -d /app/src \
  && test ! -d /app/vendor \
  && test ! -d /usr/local/lib/node_modules/npm \
  && if grep -R "CPSAT_ALLOW_TEST_HOOKS" /app/python /app/schemas /app/dist; then exit 1; fi \
  && if grep -R "continueAfterIncumbentMs" /app/python /app/schemas /app/dist; then exit 1; fi

LABEL org.opencontainers.image.source="https://github.com/kglaw-Oluseyi/atelier-doclar" \
      org.opencontainers.image.revision="${SOURCE_SHA}" \
      md.solver.model="${MODEL_VERSION}" \
      md.solver.dependency="${DEPENDENCY_IDENTITY}" \
      md.solver.ingress="none"

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SOLVER_PYTHON=/usr/local/bin/python3 \
    SOLVER_CHILD_SCRIPT=/app/python/solver_child.py \
    SOLVER_INGRESS=none \
    SOLVER_TMP=/tmp/solver \
    HOME=/home/solver \
    CPSAT_ALLOW_SYNTHETIC_WORKER=0

USER solver
WORKDIR /app

# Intentionally omits any listening-port instruction. Process liveness is the health mechanism; readiness is PostgreSQL.
HEALTHCHECK NONE
ENTRYPOINT ["node", "dist/supervisor.js"]
