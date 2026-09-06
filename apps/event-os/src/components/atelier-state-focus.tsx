"use client";

import { useEffect } from "react";

export function AtelierStateFocus({
  targetId,
  active,
}: {
  targetId: string;
  active: boolean;
}) {
  useEffect(() => {
    if (!active) return;
    const node = document.getElementById(targetId);
    node?.focus();
  }, [active, targetId]);
  return null;
}
