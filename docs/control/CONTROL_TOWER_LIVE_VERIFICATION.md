# Control Tower live-verification pack

**Slice:** MD-FC1  
**Use:** Next deployment slice. This slice does not deploy.

Distinguish **AUTOMATED** (Playwright, unit, CI) from **HUMAN LIVE ACCEPTANCE**.

Deployment is not performed here. Record the eventual URL when the Railway project `atelier-doclar` is published.

## Access

| Check | Class | Pass condition |
|-------|-------|----------------|
| Deployment URL | HUMAN LIVE ACCEPTANCE | HTTPS origin of the Railway service |
| TLS | HUMAN LIVE ACCEPTANCE | Valid certificate; no mixed content |
| Login | AUTOMATED + HUMAN | Named actor + role + valid token/IdP |
| Invalid login | AUTOMATED | Wrong token denied |
| Logout | HUMAN LIVE ACCEPTANCE | Session cookie cleared |
| Session expiry | HUMAN LIVE ACCEPTANCE | Expired cookie redirects to login |
| Role restriction | AUTOMATED + HUMAN | Restricted RAG sources hidden from reader |

## Portfolio

| Check | Class | Pass condition |
|-------|-------|----------------|
| `/programme` | AUTOMATED | Evidence-derived counts; accepted = 0 |
| Repository evidence | HUMAN | Shows `kglaw-Oluseyi/atelier-doclar` only |
| CI evidence | HUMAN | Latest trusted workflow; unknown ≠ green |
| Freshness | AUTOMATED | Stale/degraded fixtures and live stale banner |
| Unknown not green | AUTOMATED | UNKNOWN is not healthy |

## Roadmap

| Check | Class | Pass condition |
|-------|-------|----------------|
| DAG table | AUTOMATED | Accessible table is authoritative |
| Product routes | AUTOMATED | event-os, event-day, academy, marketing, ushering, integration |
| Slice drill-down | AUTOMATED | `/programme/slices/[sliceId]` |
| Evidence/commit links | AUTOMATED | Commits and evidence pages |

## Workflows

| Check | Class | Pass condition |
|-------|-------|----------------|
| Open items | AUTOMATED | List renders; resolved items visible |
| Decisions | AUTOMATED | YAML decisions appear |
| Gates | AUTOMATED | Protected gates unsigned |
| Releases | AUTOMATED | Production authorised = false |
| Protected approval rejection | AUTOMATED | Control Tower reject path; no self-approval |

## Assistant

| Check | Class | Pass condition |
|-------|-------|----------------|
| Citation | AUTOMATED | Allow-listed sources only |
| Abstention | AUTOMATED | No evidence → ABSTAIN |
| Access restriction | AUTOMATED | Restricted note hidden from reader |
| Degraded mode | AUTOMATED | RAG outage does not hide roadmap |

## Charts

| Check | Class | Pass condition |
|-------|-------|----------------|
| Data accuracy | AUTOMATED | Same snapshot as portfolio |
| Table equivalents | AUTOMATED | Every chart has a table |
| Stale/degraded | AUTOMATED | Fixtures and live stale path |

## Operations

| Check | Class | Pass condition |
|-------|-------|----------------|
| Liveness | AUTOMATED | `GET /api/health/live` → alive |
| Readiness | AUTOMATED | Production missing secrets → 503 not READY |
| Restore | AUTOMATED | Verified snapshot reconstruct |
| GitHub outage | AUTOMATED | Classified; Event OS not implied failed |
| RAG outage | AUTOMATED | Degraded; roadmap survives |
| Unsigned gates | AUTOMATED | GATE-INDEPENDENT and GATE-CEO-PRODUCTION listed |

## Browser matrix

| Engine | Class | Notes |
|--------|-------|-------|
| Current Chrome/Chromium desktop | AUTOMATED | Playwright Chromium in CI |
| Safari / WebKit | HUMAN LIVE ACCEPTANCE | Run locally when WebKit browsers are installed |
| Mobile viewport (390×844) | AUTOMATED | Portfolio axe + layout |

## Accessibility

| Check | Class |
|-------|-------|
| Keyboard | HUMAN LIVE ACCEPTANCE |
| Focus visibility | HUMAN LIVE ACCEPTANCE |
| Labels | AUTOMATED (axe) + HUMAN |
| Contrast | AUTOMATED (axe) + HUMAN |
| axe | AUTOMATED on portfolio, roadmap, ask, charts, ops |
| Screen-reader semantics | HUMAN LIVE ACCEPTANCE |

Automated totals are recorded in the MD-FC1 closeout report after the suite runs. Human live acceptance remains `OI-FC1-001`.
