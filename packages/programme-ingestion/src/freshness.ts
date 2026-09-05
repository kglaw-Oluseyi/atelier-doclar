import { AUTHORISED_REPOSITORY } from "./constants.js";
import type { SourceFreshness } from "./provider.js";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function unknownFreshness(): SourceFreshness {
  return {
    source: "github",
    repository: AUTHORISED_REPOSITORY,
    state: "UNKNOWN",
  };
}

export function evaluateFreshness(current: SourceFreshness, nowIso: string): SourceFreshness {
  if (current.state === "ERROR") return current;
  if (!current.lastSuccessfulIngestion) {
    return { ...current, state: "UNKNOWN" };
  }
  const last = Date.parse(current.lastSuccessfulIngestion);
  const now = Date.parse(nowIso);
  if (Number.isNaN(last) || Number.isNaN(now)) {
    return { ...current, state: "UNKNOWN" };
  }
  return {
    ...current,
    state: now - last > STALE_AFTER_MS ? "STALE" : "FRESH",
  };
}
