"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ACTIVE_LIFECYCLES = new Set([
  "QUEUED",
  "CLAIMED",
  "RUNNING",
  "BUILDING",
  "SEARCHING",
  "VERIFYING",
  "EXPLAINING",
  "PERSISTING",
]);

/**
 * Modest server refresh while a durable CP-SAT run is active.
 * Stops on terminal / READY_FOR_REVIEW. Does not overlap refreshes.
 */
export function CpsatRunLifecyclePoller({
  active,
  lifecycle,
  intervalMs = 5_000,
}: {
  active: boolean;
  lifecycle?: string | null;
  intervalMs?: number;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const shouldPoll =
    active && (!lifecycle || ACTIVE_LIFECYCLES.has(lifecycle) || lifecycle === "CANCELLATION_REQUESTED");

  useEffect(() => {
    if (!shouldPoll) return;
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
  }, [shouldPoll, intervalMs, router]);

  return <div data-testid="seating-run-poller" className="visually-hidden" aria-hidden="true" />;
}
