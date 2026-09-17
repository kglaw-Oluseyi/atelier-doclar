# syntax=docker/dockerfile:1.7
# event-os-solver-worker — Milestone 5 hardened production image
# No public domain, no listening port instruction, non-root, hash-pinned OR-Tools, no test fixtures.

ARG PYTHON_IMAGE=python:3.12.14-slim-bookworm@sha256:9c47360a2a0355e2da18516d0b1c2126ec22c195d2185e97347c9d98398c5bef
ARG NODE_VERSION=20.19.0
ARG NODE_TARBALL_SHA256=b4e336584d62abefad31baecff7af167268be9bb7dd11f1297112e6eed3ca0d5

FROM ${PYTHON_IMAGE} AS python-deps
WORKDIR /opt/solver-python
COPY python/requirements.linux.hashes.txt ./requirements.txt
RUN pip install --no-cache-dir --require-hashes -r requirements.txt \
  && python -c "import ortools,sys,platform; print(ortools.__version__, sys.version, platform.machine())"

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
  command -v gcc >/dev/null 2>&1 && exit 1 || true; \
  command -v git >/dev/null 2>&1 && exit 1 || true; \
  command -v curl >/dev/null 2>&1 && exit 1 || true; \
  command -v wget >/dev/null 2>&1 && exit 1 || true

COPY --from=python-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev --no-fund --no-audit \
  && npm cache clean --force

COPY src ./src
COPY python ./python
COPY schemas ./schemas

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin solver \
  && mkdir -p /tmp/solver \
  && chown -R solver:solver /app /tmp/solver \
  && test ! -f /app/python/fake_malformed_child.py \
  && test ! -f /app/python/crash_child.py \
  && test ! -d /app/test-only \
  && test ! -f /app/test-only/keep_best_timing_child.py \
  && if grep -R "CPSAT_ALLOW_TEST_HOOKS" /app/python /app/src /app/schemas; then exit 1; fi \
  && if grep -R "continueAfterIncumbentMs" /app/python /app/src /app/schemas; then exit 1; fi

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
ENTRYPOINT ["npx", "tsx", "src/supervisor.ts"]
