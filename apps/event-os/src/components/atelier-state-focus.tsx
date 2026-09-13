"use client";

import { useEffect } from "react";
import { consumeActionResultAction } from "../server/action-result-actions";
import { shouldScheduleActionResultConsume } from "./action-result-consume-once";
import {
  actionResultFocusStorageKey,
  actionResultScrollBehavior,
  prefersReducedMotion,
  shouldAttemptActionResultFocus,
} from "./action-result-focus";

const ALLOWED_FOCUS_TARGETS = new Set([
  "operational-state",
  "operational-state-title",
  "resolved-contradiction-heading",
  "placeholder-validation",
]);

const FOCUSED_IN_DOCUMENT = new Set<string>();

function blurIfHeld(targetId: string) {
  const node = document.getElementById(targetId);
  if (node && document.activeElement === node) node.blur();
}

function applyFocus(targetId: string): HTMLElement | undefined {
  const node = document.getElementById(targetId);
  if (!(node instanceof HTMLElement) || !ALLOWED_FOCUS_TARGETS.has(targetId)) return undefined;
  node.focus({ preventScroll: true });
  if (document.activeElement !== node) return undefined;
  node.scrollIntoView({
    block: "nearest",
    behavior: actionResultScrollBehavior(prefersReducedMotion()),
  });
  return document.activeElement === node ? node : undefined;
}

export function AtelierStateFocus({
  targetId,
  active,
  onceKey,
  correlationId,
  consumeAfterFocus = false,
}: {
  targetId: string;
  active: boolean;
  onceKey?: string;
  correlationId?: string;
  consumeAfterFocus?: boolean;
}) {
  const identity = correlationId || onceKey;
  useEffect(() => {
    if (!ALLOWED_FOCUS_TARGETS.has(targetId)) return;
    const storageKey = actionResultFocusStorageKey({
      pathname: window.location.pathname,
      targetId,
      onceKey: identity,
    });
    const alreadyStored = storageKey ? window.sessionStorage.getItem(storageKey) === "1" : false;
    const focusedInDocument = Boolean(identity && FOCUSED_IN_DOCUMENT.has(identity));
    const mode = shouldAttemptActionResultFocus({
      active,
      correlationId: identity,
      alreadyStored,
      focusedInDocument,
    });
    if (mode === "skip") {
      if (alreadyStored && !focusedInDocument) blurIfHeld(targetId);
      return;
    }
    let cancelled = false;
    const finish = (node: HTMLElement | undefined, markNew: boolean) => {
      if (!node || cancelled) return false;
      if (identity) FOCUSED_IN_DOCUMENT.add(identity);
      if (markNew && storageKey) window.sessionStorage.setItem(storageKey, "1");
      if (markNew && consumeAfterFocus && correlationId && shouldScheduleActionResultConsume(correlationId)) {
        void consumeActionResultAction(correlationId);
      }
      return true;
    };
    const run = (retry: boolean) => {
      if (cancelled) return;
      const node = applyFocus(targetId);
      if (finish(node, mode === "focus")) return;
      if (!retry) requestAnimationFrame(() => run(true));
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => run(false));
    });
    return () => {
      cancelled = true;
    };
  }, [active, consumeAfterFocus, correlationId, identity, targetId]);
  return null;
}
