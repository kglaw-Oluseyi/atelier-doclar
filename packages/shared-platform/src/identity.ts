import { PlatformError } from "./errors.js";
import type { Person } from "./schemas.js";

export interface IdentityMapping {
  externalSubject: string;
  email?: string;
  displayName?: string;
}

export interface IdentityAdapter {
  readonly kind: "OIDC_COMPATIBLE" | "NON_PRODUCTION_FIXTURE";
  readonly productionSafe: boolean;
  resolve(input: IdentityMapping): IdentityMapping;
}

export class NonProductionIdentityAdapter implements IdentityAdapter {
  readonly kind = "NON_PRODUCTION_FIXTURE" as const;
  readonly productionSafe = false;

  constructor(private readonly allowFixtures: boolean) {}

  resolve(input: IdentityMapping): IdentityMapping {
    if (!this.allowFixtures) {
      throw new PlatformError("FIXTURE_FORBIDDEN", "non-production identity adapter is disabled");
    }
    return input;
  }
}

/**
 * OIDC-compatible boundary. No vendor is bound. CT4-OI-001 remains OPEN.
 * A later authorised slice may supply issuer/callback verification here.
 */
export class OidcCompatibleIdentityAdapter implements IdentityAdapter {
  readonly kind = "OIDC_COMPATIBLE" as const;
  readonly productionSafe = true;

  resolve(input: IdentityMapping): IdentityMapping {
    if (!input.externalSubject.trim()) {
      throw new PlatformError("VALIDATION_FAILED", "external subject is the immutable identity key");
    }
    return input;
  }
}

export function assertNamedHuman(person: Pick<Person, "displayName" | "externalSubject">): void {
  const name = person.displayName.trim().toLowerCase();
  if (!name || name === "unknown" || name === "cursor" || name === "system") {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "actor must be a named human identity");
  }
  if (person.externalSubject.toLowerCase().includes("cursor")) {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "Cursor cannot be an operational actor");
  }
}
