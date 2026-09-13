# MD-PR-S073 Packet 7 — Gate E timing classification

**Authority:** `MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`
**Deployed application / live SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Fixture:** synthetic event `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b` (`S073-20260912T234215 Seating`)
**Not used:** accumulated Alpha One `…000021`
**Production:** `productionAuthorised:false` · fixtures enabled · S05A/S05B unchanged PASSED · adapters INACTIVE
**Raw `/tmp` logs were not committed.** Command and result UUIDs below are settlement correlations only.

Packet 7 remains functionally closed. This record classifies the first-run `3429ms` / `5790ms` wrapper numbers so they are not treated as acknowledgement times.

S073 did **not** convert launch into an asynchronous queue or worker. Measurement showed that the corrected synchronous orchestration remains inside the ratified live `<3s` bound. The solver itself took **11–17ms**.

---

## Preserved first-run evidence (do not discard)

On live SHA `1ce6e0f` at `2026-09-13T01:29:21Z`, Gate E recorded:

| Wrapper field | Value |
|---|---|
| `otherMs` | **3429** |
| `launchMs` | **5790** |

Scoped `timedAction` internals from the same run:

| Action | `dataChanged` | POST → 303 | Click → banner | Correlation |
|---|---|---|---|---|
| Launch | No (replay) | 3162ms | 3224ms | `c7213d9c-39a1-446a-a61b-a7c6ee047997` |
| Other freeze | No (replay) | 3361ms | 3429ms | `1c42078a-868b-42c4-aa1c-a56bd0e2964a` |

`5790ms` started the launch clock **before** the second tab navigated and froze, then stopped only after **both** commands finished. It is wrapper scope (other-tab `goto` + other freeze + launch), not launch settlement and not terminal solver observation.

---

## Five independently correlated samples

Each sample froze a unique seed (new package, `dataChanged` Yes), launched that package (real `APPLIED` solve), then issued an unrelated same-event freeze while the launch POST was in flight (replay, `dataChanged` No). Fresh result correlations on every command.

### Launch POST → 303 (client)

| Sample | Command | Result | Click → POST | POST → 303 |
|---|---|---|---|---|
| 1 | `617de655-671c-4548-88ae-eaad965ddd2c` | `03e479eb-51b2-4298-95f6-e2cb4aa96353` | 33ms | **2586ms** |
| 2 | `7a02b3d6-6816-4c3b-829a-0373fa94ac10` | `593f8eea-51e7-44a7-8a43-23ad9694c633` | 21ms | **2342ms** |
| 3 | `4baad7b0-603f-4d09-9a53-719c5e7ef0f2` | `1d4d7297-c142-4c47-9bff-87df6ff9b834` | 40ms | **2510ms** |
| 4 | `12fea166-9263-494c-b393-9b58924eeb43` | `6d9a1e92-53cb-43b1-b8e5-b79db865500a` | 22ms | **2931ms** |
| 5 | `143159a4-77f3-4cf4-917e-97a5d5fa8ee4` | `948b745b-6227-410b-a8b1-6be078489e25` | 33ms | **2712ms** |

Launch POST: n=5 · min 2342 · **median 2586** · **p95/max 2931**. All under 3000ms.

### Unrelated mutation POST → 303 while launch was active (client)

| Sample | Command | Result | Click → POST | POST → 303 |
|---|---|---|---|---|
| 1 | `9c78b97a-63bd-46a7-a24c-0b1056f710f8` | `4c762da3-f0fa-4338-8582-c7ab1be158e9` | 21ms | **1472ms** |
| 2 | `392403ba-ccef-4d89-96d3-62d3cf96a9e3` | `9263291f-9bff-4afe-a55f-42503b4b0abb` | 20ms | **1337ms** |
| 3 | `918a5a28-ee99-4ad5-85c5-89d1fad11f43` | `df100c47-f1f1-4d90-b625-9c7fa807d02f` | 17ms | **1489ms** |
| 4 | `739d070a-b499-4cda-825b-f1d0d056c9d7` | `5844a4e1-b528-4d0d-b92f-c0bd63b32819` | 19ms | **1680ms** |
| 5 | `fc31e67e-d742-4726-a4c5-0e31d8dc921c` | `812d0813-f69a-4c01-80af-c0c653efb195` | 19ms | **1434ms** |

Other POST: n=5 · min 1337 · **median 1472** · **p95/max 1680**. All under 3000ms.

Matching banner after a 303, once the result URL is present, settled in **35–73ms**. First-run `timedAction` banner after 303 was **+56ms** (launch) and **+68ms** (other). Larger click-to-banner numbers in the resample included an extra Playwright `page.goto` after the 303 and are not acknowledgement time.

---

## Server-stage breakdown

Railway `md.seating.settlement` traces, in-process wall from `HTTP_RECEIVED`. Launch **does** complete solver, independent validation and terminal persistence before it emits 303. That path is not `5790ms`.

### Launch (real solve)

| Sample | HTTP → 303 | Prepare TX | Solver | Validate | Persist TX |
|---|---|---|---|---|---|
| 1 | 1305 | 417 | **11** | ~0 | 645 |
| 2 | 1162 | 357 | **11** | ~0 | 532 |
| 3 | 1301 | 424 | **16** | ~0 | 632 |
| 4 | 1459 | 425 | **17** | ~1 | 794 |
| 5 | 1279 | 410 | **15** | ~0 | 638 |

- **Package compilation:** 1–2ms on the unique-seed freeze, between freeze TX1 and TX2. Freeze server 303 was 389–640ms.
- **Solver:** 11–17ms.
- **Independent validation:** 0–1ms (no named stage; gap `SOLVER_TERMINAL` → persist `TX_BEGIN`).
- **Terminal persistence:** persist TX 532–794ms. Largest in-process launch stage. No transaction exceeded the 2s diagnostic ceiling.

### Concurrent unrelated freeze (replay)

Server 303 469–618ms. Outcome `REPLAYED`. Isolation holds on the mutation itself.

---

## Classification

1. `5790ms` is measurement scope. Gate E acknowledgement passes.
2. Launch waits for solver + validation + persist before 303, but genuine settlement is 1.16–1.46s in-process and 2.34–2.93s client POST. It is not a 5.8s acknowledgement and does not authorise a queue/worker.
3. The unrelated mutation itself is not over 3s on the five fresh samples.
4. First-run `3224ms` / `3429ms` remain recorded. They were concurrent replays under the wrapper.

No timeouts were increased. The solver was not changed. No queue, worker, or sibling process was introduced because measured Branch B was corrected and the final live targets passed.
