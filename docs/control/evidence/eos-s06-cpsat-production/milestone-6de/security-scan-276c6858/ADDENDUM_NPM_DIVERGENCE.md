# Addendum — npm/npx/corepack live divergence

**Recorded:** 2026-09-18T05:00:00Z  
**Scope:** Explain why live deployment `57b5c9fb-4538-44ef-ad90-7d731a7db948` has `/usr/local/bin/{npm,npx,corepack}` while digest `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` does not when run/scanned as an image.  
**Constraints observed:** no rebuild, redeploy, Dockerfile change, install/remove on live.  
**Disposition:** none (CTO only).

---

## Q1 — Where do npm/npx/corepack come from on the live container?

### What they are

| Path | Live observation |
|---|---|
| `/usr/local/bin/npm` → `../lib/node_modules/npm/bin/npm-cli.js` | symlink; uid/gid 1000; **mtime 2025-03-13** (Node distro); **birth/change 2026-09-17T21:34:39Z** (deploy materialization) |
| `/usr/local/bin/npx`, `/usr/local/bin/corepack` | same pattern |
| Versions (read-only `--version`) | npm/npx **10.8.2**, corepack **0.31.0** |
| Mount | Single root **overlay** (`findmnt -T /usr/local/bin/npm` → `/` overlay). **Not** a separate volume. Same device id as `/usr/local/bin/node` and `/app/dist/supervisor.js`. |
| Nixpacks / `.railway` / `/nix` | **Absent** — this service runs a prebuilt GHCR image, not a Nixpacks build rootfs. |

### What the scanned digest’s own layers contain

`docker history` + `docker save` layer inspection of `…@sha256:276c6858…788f`:

| Layer index | Content |
|---|---|
| **Layer 4** (`642b07de…`) | **Adds** `usr/local/bin/{npm,npx,corepack}` + full `/usr/local/lib/node_modules/{npm,corepack}` (Node 20.19.0 tarball extract — matches Dockerfile `tar … -C /usr/local`) |
| **Layer 9** (`7b28ab94…`) | **Whiteouts only:** `usr/local/bin/.wh.npm`, `.wh.npx`, `.wh.corepack`, `usr/local/lib/node_modules/.wh.npm`, `.wh.corepack` — from Dockerfile `rm -rf …/npm …/corepack` + `rm -f …/npm …/npx …/corepack` |

Dockerfile intent (unchanged, cited for provenance only):

```text
# Install runtime Node deps, then remove npm/npx/corepack so the toolchain is absent from the final image.
RUN npm install …
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
  && test ! -e /usr/local/bin/npm …
```

A later gate layer also `test ! -d /usr/local/lib/node_modules/npm`.

### Why `docker run` / Trivy of the digest see no npm

Docker/containerd clients that correctly apply OCI whiteouts hide the layer-4 files when layer-9 whiteouts are present. Confirmed:

```text
docker run … @sha256:276c6858… → NPM_NO / COREPACK_NO
```

Trivy scanned that composed view — correctly reflecting the **image** contract.

### Why the live Railway container still shows npm

Best-supported explanation from the evidence:

**The live Railway overlay is exposing the Node-tarball layer’s npm/npx/corepack because the Dockerfile’s OCI whiteout layer is not taking effect in that runtime view** — not because a volume mounted them, not because Nixpacks wrapped the image, and not because Trivy failed to unpack the digest.

Supporting facts:

1. Files’ **mtime is the original Node distro timestamp (2025-03-13)**, while **birth is deploy-time (2026-09-17T21:34Z)** — consistent with lower-layer content becoming visible when the overlay is assembled, not with a post-start `npm install`.
2. Whiteouts **are present in the image blob** (layer 9) and **are applied by local Docker** (npm absent).
3. Live has npm **present** on the same overlay as the rest of the image; no separate mount for `/usr/local`.
4. App bits still match the digest (`supervisor.js` / `solver_child.py` / `node` sha256 identical) — so this is not whole-image substitution; it is specifically the whiteouted toolchain paths reappearing.

**Ruled out / not supported:**

| Hypothesis | Evidence against |
|---|---|
| Nixpacks/Railway builder base always injects npm | No Nixpacks markers; image is GHCR digest; history shows explicit npm **removal** layer |
| Persistent volume/cache mount | `findmnt` → root overlay only; same device as `node` |
| Trivy missed a layer that still contains npm in the final view | Final composed image via Docker has no npm; whiteouts exist and work under Docker |
| Post-deploy install into upperdir | Would typically show new mtimes; observed mtime is Node distro date |

**Residual uncertainty (stated plainly):** We cannot read Railway’s host-side snapshotter from inside the guest to prove whiteout-handling bug vs. an undocumented host-side re-materialization. From guest evidence, whiteout non-effect on the live overlay is the only hypothesis that fits all observations.

---

## Q2 — Did the same divergence exist for accepted candidate `sha256:a41f519…92`?

### Image-side (directly verified)

| Check | `a41f519…92` (candidate-bbec476) | `276c6858…788f` (m6e-worker / live) |
|---|---|---|
| `docker run` npm/npx/corepack | **ABSENT** | **ABSENT** |
| Layer adds npm (Node tarball) | **Yes** (layer 4) | **Yes** (layer 4) |
| Layer whiteouts `.wh.npm/.wh.npx/.wh.corepack` | **Yes** (layer 9, same paths) | **Yes** (layer 9, same paths) |

So the **image construction is the same pattern** for both digests: npm is introduced then whiteout-deleted. Milestone-5c’s claim “npm/npx/… absent from runtime **image**” is **correct for both digests when the image is composed with whiteouts applied**.

### Live Railway-side for candidate

**Not directly observed.** Candidate `a41f519…92` is still pullable locally but is **not** the current production deployment (`57b5c9fb…` runs `276c6858…788f`). No live Railway replica of the candidate was available to SSH for this addendum.

**Inference (labeled as inference, not observation):** Any Railway runtime view that fails to honor these whiteouts would show the **same** live divergence for the candidate as for `276c6858…788f`. Milestone-5c’s compensating-control check was against the **image**, not against a live Railway overlay of that candidate — so this live whiteout gap was **previously unchecked as a platform characteristic**, not proven absent for the candidate deploy.

---

## Q3 — Reachable from PID 1 supervisor → fixed-argv Python child?

### Code path (observed)

| Fact | Evidence |
|---|---|
| Sole production `spawn` | `spawn(options.pythonPath, [options.scriptPath], { env: cleanEnv, … })` in `/app/dist/supervisor.js` |
| Fixed argv | `SOLVER_PYTHON=/usr/local/bin/python3`, `SOLVER_CHILD_SCRIPT=/app/python/solver_child.py` |
| `shell: true` | **0** matches in bundle |
| Bundle strings `npm`/`npx`/`corepack` | **None** (grep) |
| `solver_child.py` refs to npm/npx/corepack/subprocess shell | **None** (grep) |
| `buildCleanEnv()` | Copies `PATH: process.env.PATH ?? "/usr/bin:/bin"` plus HOME/LANG/PYTHONUNBUFFERED/TMPDIR — **does not** pass DB credentials; **does** inherit supervisor PATH (which includes `/usr/local/bin` on this image) |

### Invocable on disk?

| Actor | Can resolve `npm`/`npx`? |
|---|---|
| `solver` UID (10001) via `command -v` | **Yes** — `/usr/local/bin/npm`, `/usr/local/bin/npx` exist and are executable |
| Supervisor intentional spawn path | **No** — never calls them; only spawns fixed Python argv |
| Python child intentional path | **No** — no npm references |

### Labels (same discipline as CVE reachability)

| Question | Label |
|---|---|
| On the production supervisor → Python child **control flow**? | **UNREACHABLE** |
| Present and executable on the live filesystem for UID 10001? | **PRESENT** (live only; **NOT PRESENT** in correctly composed digest image) |
| Invocable if arbitrary command execution is already achieved in-process? | **Yes** (local binaries on PATH) — secondary surface, not the spawn path |

### Does this change `03_RUNTIME_PROCESS_CONTRACT.md`?

**Yes, narrowly — for the live container compensating-control row “npm/npx absent”, not for the spawn-path contract.**

| Claim in `03_RUNTIME_PROCESS_CONTRACT.md` | After this addendum |
|---|---|
| Entrypoint / fixed-argv Python spawn / `shell: true`=0 / CapEff=0 / UID 10001 | **Unchanged** — still hold on live PID 1 |
| “npm/npx absent” on **digest image** | **Still true** under Docker/Trivy composition |
| “npm/npx absent” on **live Railway overlay** | **False** — present; prior PASS for that live row does not hold |
| Attack-surface conclusion for **CVE reachability table** (util-linux/ncurses/… not on spawn path) | **Unchanged** — npm presence does not make those CVEs REACHABLE |
| Attack-surface conclusion for **“toolchain absent from runtime” compensating control** | **Weakened for live** — npm/npx/corepack are on disk and on PATH for the solver user even though unused by the designed spawn path |

No ACCEPT/REJECT is stated here.
