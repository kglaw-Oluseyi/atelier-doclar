# Runtime process contract

## Candidate identity
- Tag: `event-os-solver-worker:candidate-bbec476`
- Digest: `sha256:a41f51937a653ed4653bbc687addb3a8f2603799accfec8c0dac0f09aef86e92`
- Revision label: `bbec476f0ca9959d7145853fc45461d10879fc01`
- Base: `python:3.12.14-slim-trixie@sha256:2fe5997d249a808b8eeea52c58a1dbffbba28754dc11699ef5c029f2d818ce79`

## Container entrypoint / command
- Config.Entrypoint: `["node", "dist/supervisor.js"]`
- Config.Cmd: `null`
- Working directory: `/app`
- Supervisor bundle present at `/app/dist/supervisor.js`

## Worker identity
- Config.User: `solver` → UID/GID `10001:10001` (`/etc/passwd`: `solver:x:10001:10001::/home/solver:/usr/sbin/nologin`)
- Observed `/proc/self/status`: Uid/Gid all `10001`
- CapInh/CapPrm/CapEff/CapAmb: `0000000000000000` (no effective/permitted/inheritable/ambient capabilities)
- CapBnd: Docker default bounding set only; CapEff remains zero
- ExposedPorts: none
- Listening sockets (`/proc/net/tcp`, `/proc/net/tcp6`): empty (header only)

## Production child-process calls
Repository production paths inspected:
- `apps/event-os-solver-worker/src/child-runner.ts` — sole production spawn site used by supervisor
- `apps/event-os-solver-worker/src/supervisor.ts` — wires fixed absolute `SOLVER_PYTHON` + `SOLVER_CHILD_SCRIPT`
- Bundled image `/app/dist/supervisor.js` — contains one `spawn(options.pythonPath, [options.scriptPath], …)`

Exact production spawn (source and bundle):
```
spawn(options.pythonPath, [options.scriptPath], {
  stdio: ["pipe", "pipe", "pipe", "pipe"],
  env: cleanEnv,
  detached: true,
});
```

Image defaults:
- `SOLVER_PYTHON=/usr/local/bin/python3`
- `SOLVER_CHILD_SCRIPT=/app/python/solver_child.py`

Supervisor resolves absolute paths and rejects non-absolute paths. Executable name and script path come from worker environment / image wiring, not from solver request payload or database values.

`shell: true` count in `/app/dist/supervisor.js`: **0**
`shell: true` in worker `src/`: **absent**

Non-production note (out of image / not launched by supervisor entrypoint):
- `packages/shared-platform/src/cpsat/local-solve.ts` also uses argv `spawn(python, [script], …)` without `shell: true` (dev/local helper; not the worker entrypoint).
- `apps/event-os-solver-worker/src/child-runner.ts` crash-containment helper spawn exists in source but crash fixtures are absent from the production image.

## Required results
| Requirement | Result |
|---|---|
| Supervisor starts Node directly | PASS — entrypoint `node dist/supervisor.js` |
| Supervisor starts only approved Python solver child | PASS — `/usr/local/bin/python3` + `/app/python/solver_child.py` |
| argv execution | PASS — `spawn(exe, [script], …)` |
| `shell: true` absent | PASS |
| No arbitrary executable from job input | PASS |
| UID 10001 | PASS |
| No additional Linux capabilities (CapEff=0) | PASS |
| No application ingress | PASS — no ExposedPorts; no listening TCP |

**Process contract: PASS**
