# Sign-in timing after identity maintenance

Host: `https://event-os-production-bc8d.up.railway.app`

Focused warm POST `/sign-in` samples after identity maintenance (fixture email + access token form fields; Next server-action completion not claimed):

| Metric | Value |
|--------|-------|
| p50 | ~477 ms |
| p95 / max | ~512 ms |
| Samples | 5 |

Interpretation: warm auth path remains sub-second and consistent with accepted remediation (prior defect 32–36 s). AI CTO accepted timings remain the governing acceptance basis (p50 276 ms / p95 867 ms). No credentials recorded.
