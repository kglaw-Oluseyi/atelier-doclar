# syntax=docker/dockerfile:1.7
# event-os-solver-worker — Linux amd64 production image (Checkpoint 2A)
# No public domain, no listening product port, non-root, hash-pinned OR-Tools.

ARG PYTHON_IMAGE=python:3.12.14-slim-bookworm@sha256:9c47360a2a0355e2da18516d0b1c2126ec22c195d2185e97347c9d98398c5bef
ARG NODE_VERSION=20.19.0
# Official node-v20.19.0-linux-x64.tar.xz SHA-256 from nodejs.org SHASUMS256.txt
ARG NODE_TARBALL_SHA256=b4e336584d62abefad31baecff7af167268be9bb7dd11f1297112e6eed3ca0d5

FROM ${PYTHON_IMAGE} AS python-deps
WORKDIR /opt/solver-python
COPY python/requirements.linux.hashes.txt ./requirements.txt
RUN pip install --no-cache-dir --require-hashes -r requirements.txt \
  && python -c "import ortools,sys,platform; print(ortools.__version__, sys.version, platform.machine())"

FROM ${PYTHON_IMAGE} AS runtime
ARG NODE_VERSION
ARG NODE_TARBALL_SHA256
ENV NODE_VERSION=${NODE_VERSION}

# System packages + Node 20.19.0 official linux-x64 binary (supervisor only)
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
  rm -rf /var/lib/apt/lists/*

# Python deps from builder
COPY --from=python-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev --no-fund --no-audit \
  && npm cache clean --force

COPY src ./src
COPY python ./python
COPY scripts ./scripts

# Non-root runtime user; per-run tmp under /tmp/solver
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin solver \
  && mkdir -p /tmp/solver \
  && chown -R solver:solver /app /tmp/solver

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SOLVER_PYTHON=/usr/local/bin/python3 \
    SOLVER_CHILD_SCRIPT=/app/python/solver_child.py \
    SOLVER_INGRESS=none \
    SOLVER_TMP=/tmp/solver \
    HOME=/home/solver

USER solver
WORKDIR /app

# Intentionally no EXPOSE. Supervisor must ignore any injected PORT.
HEALTHCHECK NONE
CMD ["npx", "tsx", "src/supervisor.ts"]
