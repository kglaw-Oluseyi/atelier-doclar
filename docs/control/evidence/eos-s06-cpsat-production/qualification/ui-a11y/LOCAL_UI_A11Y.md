# Local operator UI / accessibility (Checkpoint 2)

Synthetic fixtures only. No Event OS deployment.

## Surface

- Component: `apps/event-os/src/components/cpsat-run-status-panel.tsx`
- Wired: `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx`
- Copy model: `packages/shared-platform/src/cpsat/ui-model.ts` (plain language; no CP-SAT/Python jargon on ordinary labels)

## States covered by UI model + panel

submit/queue, model preparation, solving, verifying, explanation generation, completion, cancellation requested, cancelled, infeasible, search incomplete, timed out, invalid input, solver fault, safe retry, replay/no-change, result review, per-guest placement reason list (scrollable), export hook left to authorised download path (not activated).

## UX checks (local review)

| Check | Result |
|---|---|
| No invented percent complete | Pass — panel forbids percent/ETA optimism |
| No blank consequential state | Pass — phase + product result always shown |
| No permanent “Solving…” | Pass — productResult + phase driven by run model |
| Responsive 360 / 768 / 1280 | Pass — CSS collapses dl to 1-col at ≤360px; list scrolls |
| Keyboard / focus visible | Pass — `:focus-visible` outline on panel |
| Heading hierarchy | Pass — h2 status, h3 guest reasons |
| Live regions | Pass — `role="status"` / `aria-live="polite"` on product+phase; `role="alert"` on fault |
| Long 1000/2000 guest reason list | Pass — `maxHeight` + overflow auto |
| axe serious/critical | Deferred to Checkpoint 3 browser axe run against deployed local fixture page — static review found no serious ARIA anti-patterns; **not claimed as automated axe zero without browser run** |

## Limitation

Automated axe + full viewport screenshot matrix not executed in this shard (no browser automation authority in this continuation). Static a11y structure is in place for Checkpoint 3 confirmation.
