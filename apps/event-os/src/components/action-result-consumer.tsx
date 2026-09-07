"use client";

import { useEffect, useRef } from "react";
import { consumeActionResultAction } from "../server/action-result-actions";

export function ActionResultConsumer({
  enabled,
  correlationId,
}: {
  enabled: boolean;
  correlationId?: string;
}) {
  const consumed = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!enabled || !correlationId || consumed.current === correlationId) return;
    consumed.current = correlationId;
    void consumeActionResultAction(correlationId);
  }, [enabled, correlationId]);
  return null;
}
