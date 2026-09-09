export function actionResultFocusStorageKey(input: {
  pathname: string;
  targetId: string;
  onceKey?: string;
}): string | undefined {
  if (!input.onceKey) return undefined;
  return `atelier-focus:${input.pathname}:${input.targetId}:${input.onceKey}`;
}

export function shouldRequestActionResultFocus(input: {
  shouldConsume: boolean;
  viewKind?: string;
  application?: string;
  focusOnSuccess?: boolean;
}): boolean {
  if (!input.shouldConsume || !input.viewKind) return false;
  if (input.viewKind === "conflict" || input.viewKind === "forbidden" || input.viewKind === "validation") {
    return true;
  }
  return Boolean(input.focusOnSuccess && (input.viewKind === "success" || input.application));
}

export function shouldStealActionResultFocus(input: {
  active: boolean;
  navigationType?: string;
  alreadyPresented?: boolean;
}): boolean {
  if (!input.active) return false;
  if (input.navigationType === "reload") return false;
  if (input.alreadyPresented) return false;
  return true;
}

export function shouldReleaseActionResultFocus(input: { navigationType?: string }): boolean {
  return input.navigationType === "reload";
}
