# Watch-pattern chronology (MD-PR-S080)

| Step | State | Notes |
|------|-------|-------|
| Preflight | Event OS `watchPatterns` `[]` | Control Tower `/__CONTROLLED_DEPLOY_ONLY__/**` |
| Identity maintenance | `EVENT_OS_GIT_SHA` → `7131788…` | Config rebuild `9d069fbd-…` SUCCESS (distinct) |
| Before push | Event OS set to `/__CONTROLLED_DEPLOY_ONLY__/**` | Config rebuild `8bcc499e-…` SUCCESS (watch-set rebuild; source still `7131788…`) |
| Push `0433abd` | Guard active | **No Event OS product deploy from push** (top remained `8bcc499e` until restore). Control Tower saw SKIPPED `90714107-…` |
| Restore | Event OS restored to `[]` | Restore-triggered rebuild `db44af5f-…` SUCCESS from source `0433abd…` (includes Gate 1 posture stamp). **Not claimed as “no deployment.”** |
| Final live | applicationSha `7131788…` via `EVENT_OS_GIT_SHA`; deploymentSourceSha `0433abd…` | Identity variable and watch/restore rebuilds distinguished |

Control Tower remained untouched for product mutation.
