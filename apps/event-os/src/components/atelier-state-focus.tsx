"use client";

import { useEffect } from "react";
import { actionResultFocusStorageKey, shouldStealActionResultFocus } from "./action-result-focus";

const ALLOWED_FOCUS_TARGETS = new Set([
  "operational-state",
  "operational-state-title",
  "resolved-contradiction-heading",
  "placeholder-validation",
]);

function navigationType(): string | undefined {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type;
}

function blurIfHeld(targetId: string) {
  const node = document.getElementById(targetId);
  if (node && document.activeElement === node) node.blur();
}

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
    if (!ALLOWED_FOCUS_TARGETS.has(targetId)) return;
    const storageKey = actionResultFocusStorageKey({
      pathname: window.location.pathname,
      targetId,
      onceKey,
    });
    const alreadyPresented = storageKey ? window.sessionStorage.getItem(storageKey) === "1" : false;
    const steal = shouldStealActionResultFocus({
      active,
      navigationType: navigationType(),
      alreadyPresented,
    });
    if (!steal) {
      if (storageKey && active) window.sessionStorage.setItem(storageKey, "1");
      blurIfHeld(targetId);
      requestAnimationFrame(() => blurIfHeld(targetId));
      return;
    }
    const deadline = Date.now() + 12_000;
    const timers: number[] = [];
    let observer: MutationObserver | undefined;
    const focus = () => {
      if (Date.now() > deadline) {
        observer?.disconnect();
        return;
      }
      if (storageKey && window.sessionStorage.getItem(storageKey) === "1") {
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
