# Runtime process contract — digest sha256:276c6858…788f

**Verified:** 2026-09-18T04:45Z  
**Sources:** `docker image inspect` + `docker run --rm` of exact digest; `railway ssh -s solver-worker` against deployment `57b5c9fb…`.

## Identity
- Tag: `event-os-solver-worker:m6e-worker-8c8d922`
- Digest: `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`
- Railway `CPSAT_IMAGE_DIGEST`: same digest
- `SOURCE_SHA`: `8c8d92241a550348f3ba44192cb07f655ffe6d5d`

## Container entrypoint / command
- Image Config.Entrypoint: `["node","dist/supervisor.js"]` (from inspect)
- Live `/proc/1/cmdline`: `node dist/supervisor.js`
- Working directory: `/app`
- Supervisor bundle sha256 (digest image **and** live): `4b49b4cedf4679d70cedebd18a517b4143473a82a0cd2ab0a1665789d3e269dd`
- Child script sha256 (both): `177dadcaf13c4d8e710b03965ef76a837772324fecd7fe3c7a50903bbcf2b0cd`

## Worker identity (live PID 1 = supervisor)
| Check | Result |
|---|---|
| `/etc/passwd` solver | `solver:x:10001:10001::/home/solver:/usr/sbin/nologin` |
| `/proc/1` Uid/Gid | all **10001** |
| CapInh/CapPrm/CapEff/CapAmb | **0000000000000000** |
| CapBnd | `00000000800405fb` (bounding set only; CapEff remains 0) |
| Image Config.User | `solver` |
| Note | `railway ssh` session itself runs as root; **supervisor PID 1** is non-root |

## Listening / ingress
- Image `ExposedPorts`: none
- Live `/proc/net/tcp`: header only (no sockets)
- Live `/proc/net/tcp6`: one socket in state `01` (ESTABLISHED), uid 10001 — **not** LISTEN (`0A`)
- Railway `SOLVER_INGRESS=none`

## Production child-process calls
Bundle contains exactly one production spawn site:

```
spawn(options.pythonPath, [options.scriptPath], {
  stdio: ["pipe", "pipe", "pipe", "pipe"],
  env: cleanEnv,
  detached: true,
});
```

`buildCleanEnv()` returns only:
`PATH`, `HOME`, `LANG=C.UTF-8`, `PYTHONUNBUFFERED=1`, `TMPDIR` (from `SOLVER_TMP` or `/tmp/solver`).

Railway env:
- `SOLVER_PYTHON=/usr/local/bin/python3`
- `SOLVER_CHILD_SCRIPT=/app/python/solver_child.py`

`shell: true` count in `/app/dist/supervisor.js`: **0**

## Tooling presence

| Tool | Digest image (`docker run` of scanned digest) | Live Railway container |
|---|---|---|
| npm / npx / corepack | **ABSENT** | **PRESENT** under `/usr/local/bin` |
| git / curl / wget | ABSENT | ABSENT |
| gcc / cc / make / g++ | ABSENT | ABSENT |
| getfacl / setfacl / homectl | ABSENT | ABSENT |
| mount / nsenter / login / infocmp / perl | PRESENT (base OS) | PRESENT |
| Archive::Tar (Perl module) | **not loadable** | **not loadable** |
| `/app/python/model/selftest.py` | PRESENT | PRESENT |
| dependency `node_modules/*/test*` | PRESENT (transitive) | PRESENT |

**Filesystem divergence:** live overlay contains `npm`/`npx`/`corepack` not present in the immutable digest layers Trivy scanned. Supervisor/solver content hashes and `node` binary hash (`34bc6627…c823`) match the digest image. npm is **not** invoked by the supervisor→child spawn path (fixed python argv + cleanEnv).

## Required-results checklist

| Requirement | Digest image | Live container |
|---|---|---|
| Supervisor starts Node directly | PASS | PASS |
| Only approved Python child argv | PASS | PASS |
| `shell: true` absent | PASS | PASS |
| UID 10001 (PID 1) | PASS (Config.User) | PASS |
| CapEff=0 (PID 1) | — | PASS |
| No application LISTEN ports | PASS | PASS |
| npm/npx absent | PASS | **FAIL vs prior claim** (present on live overlay) |
| git/curl/wget/compilers absent | PASS | PASS |
| Child env without DB credentials | PASS | PASS (cleanEnv) |
| No test fixtures in image | **Partial** — `selftest.py` + dep test files present | Same |
