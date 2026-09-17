# syntax=docker/dockerfile:1.7
# event-os-solver-worker — no ingress, Node supervisor + Python OR-Tools child
# Railway: do not assign public domain; do not expose PORT for product traffic.

FROM python:3.12.10-slim-bookworm AS python-deps
WORKDIR /opt/solver-python
COPY python/requirements.prod.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

FROM node:20.19.0-bookworm-slim AS node-deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20.19.0-bookworm-slim AS runtime
# Install Python 3.12 runtime alongside Node for the short-lived child.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY --from=python-deps /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=python-deps /usr/local/bin /usr/local/bin
COPY package.json tsconfig.json ./
COPY src ./src
COPY python ./python

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    SOLVER_PYTHON=/usr/local/bin/python3 \
    SOLVER_CHILD_SCRIPT=/app/python/solver_child.py \
    # Explicit: no HTTP listen expected
    SOLVER_INGRESS=none

# Do not EXPOSE a product port. Railway may inject PORT — supervisor must ignore it.
CMD ["npx", "tsx", "src/supervisor.ts"]
