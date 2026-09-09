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
    const deadline = Date.now() + 12_000;
    const timers: number[] = [];
    let observer: MutationObserver | undefined;
    const focus = () => {
      if (Date.now() > deadline) {
        observer?.disconnect();
        return;
      }
      const node = document.getElementById(targetId);
      if (!node) return;
      node.scrollIntoView({ block: "start", behavior: "auto" });
      if (typeof node.focus === "function") node.focus();
      observer?.disconnect();
    };
    focus();
    requestAnimationFrame(focus);
    observer = new MutationObserver(focus);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    for (const ms of [50, 150, 300, 600, 1_000, 2_000, 4_000, 8_000]) {
      timers.push(window.setTimeout(focus, ms));
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [active, targetId]);
  return null;
}
