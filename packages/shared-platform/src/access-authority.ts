export const SYNTHETIC_RAILWAY_PROJECT_NAME = "atelier-doclar";

export type IdentityAdapterKind = "NON_PRODUCTION_FIXTURE" | "OIDC_COMPATIBLE" | "UNBOUND";
export type HostedRuntime = "LOCAL" | "RAILWAY";

export interface AccessAuthority {
  productionAuthorised: boolean;
  identityAdapter: IdentityAdapterKind;
  hostedRuntime: HostedRuntime;
  railwayProjectName?: string;
}

export function hostedRuntimeFromEnv(env: Record<string, string | undefined>): HostedRuntime {
  if (env.RAILWAY_PROJECT_ID || env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_NAME) return "RAILWAY";
  return "LOCAL";
}

export function resolveAccessAuthority(input: {
  productionAuthorised: boolean;
  fixturesAllowed: boolean;
  env: Record<string, string | undefined>;
}): AccessAuthority {
  return {
    productionAuthorised: input.productionAuthorised,
    identityAdapter: input.fixturesAllowed ? "NON_PRODUCTION_FIXTURE" : "UNBOUND",
    hostedRuntime: hostedRuntimeFromEnv(input.env),
    railwayProjectName: input.env.RAILWAY_PROJECT_NAME,
  };
}

export function localFixtureAccessAuthority(): AccessAuthority {
  return {
    productionAuthorised: false,
    identityAdapter: "NON_PRODUCTION_FIXTURE",
    hostedRuntime: "LOCAL",
  };
}

export function coerceAccessAuthority(authority: AccessAuthority | boolean): AccessAuthority {
  if (typeof authority !== "boolean") return authority;
  if (authority) {
    return {
      productionAuthorised: true,
      identityAdapter: "OIDC_COMPATIBLE",
      hostedRuntime: "LOCAL",
    };
  }
  return localFixtureAccessAuthority();
}
