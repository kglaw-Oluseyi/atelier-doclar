"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Modest server refresh while a durable CP-SAT run is queued or cancellation is pending.
 * Stops on unmount or when polling is disabled. Does not overlap refreshes.
 */
export function CpsatRunLifecyclePoller({
  active,
  intervalMs = 5_000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        router.refresh();
      } finally {
        window.setTimeout(() => {
          inFlight.current = false;
        }, 250);
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs, router]);

  return <div data-testid="seating-run-poller" className="visually-hidden" aria-hidden="true" />;
}
