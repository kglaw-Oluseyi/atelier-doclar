/** Runtime posture gates for Atelier Command. */
import { DEFAULT_RUNTIME_POSTURE, type RuntimePosture } from "./policy.js";

export function resolveAtelierRuntimePosture(overrides?: Partial<RuntimePosture>): RuntimePosture {
  // productionAuthorised remains false unless a separate CEO governance decision changes it.
  return {
    ...DEFAULT_RUNTIME_POSTURE,
    ...overrides,
    productionAuthorised: false,
    providersActive: false,
    externalEffectsEnabled: false,
  };
}
