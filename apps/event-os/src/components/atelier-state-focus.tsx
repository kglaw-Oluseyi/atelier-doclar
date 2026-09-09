"use client";

import { useEffect } from "react";

const ALLOWED_FOCUS_TARGETS = new Set([
  "operational-state",
  "operational-state-title",
  "resolved-contradiction-heading",
  "placeholder-validation",
]);

export function AtelierStateFocus({
  targetId,
  active,
  onceKey,
}: {
  targetId: string;
  active: boolean;
  onceKey?: string;
}) {
  useEffect(() => {
    if (!active) return;
    if (!ALLOWED_FOCUS_TARGETS.has(targetId)) return;
    const route = `${window.location.pathname}${window.location.hash}`;
    const storageKey = onceKey ? `atelier-focus:${route}:${targetId}:${onceKey}` : undefined;
    if (storageKey && window.sessionStorage.getItem(storageKey) === "1") return;
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
      if (storageKey) window.sessionStorage.setItem(storageKey, "1");
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
  }, [active, onceKey, targetId]);
  return null;
}
