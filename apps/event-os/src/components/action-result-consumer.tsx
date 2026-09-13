"use client";

import { useEffect } from "react";
import { consumeActionResultAction } from "../server/action-result-actions";
import { shouldScheduleActionResultConsume } from "./action-result-consume-once";

export function ActionResultConsumer({
  enabled,
  correlationId,
}: {
  enabled: boolean;
  correlationId?: string;
}) {
  useEffect(() => {
    if (!enabled || !correlationId || !shouldScheduleActionResultConsume(correlationId)) return;
    void consumeActionResultAction(correlationId);
  }, [enabled, correlationId]);
  return null;
}
