const FULL_SHA = /^[a-f0-9]{40}$/i;

export type ApplicationIdentity = {
  /** Immutable application SHA embedded when this bundle was built. */
  applicationSha: string;
  /** Alias required by existing health/System surfaces. */
  deployedSha: string;
  /** How the embedded SHA was chosen at build time. */
  buildIdentitySource: string;
  /** ISO timestamp when the build identity was captured. */
  buildIdentityCapturedAt: string;
  /**
   * Git revision Railway associates with this deployment when present
   * (GitHub/Git deploys). Upload/archive deploys may leave this unset.
   */
  deploymentSourceSha: string | null;
  /**
   * Optional separately declared documentation HEAD.
   * Never conflated with applicationSha.
   */
  documentationHead: string | null;
};

export function resolveApplicationIdentity(input: {
  buildEmbeddedSha: string;
  buildIdentitySource: string;
  buildIdentityCapturedAt: string;
  railwayGitCommitSha?: string;
  eventOsGitSha?: string;
  documentationHead?: string;
}): ApplicationIdentity {
  const embedded = input.buildEmbeddedSha.trim().toLowerCase();
  const railway = input.railwayGitCommitSha?.trim().toLowerCase();
  const pinned = input.eventOsGitSha?.trim().toLowerCase();
  const docs = input.documentationHead?.trim().toLowerCase();

  // Build-embedded full SHA always wins — stale EVENT_OS_GIT_SHA must not override.
  let applicationSha = embedded;
  if (!FULL_SHA.test(applicationSha)) {
    if (railway && FULL_SHA.test(railway)) applicationSha = railway;
    else if (pinned && FULL_SHA.test(pinned)) applicationSha = pinned;
    else applicationSha = embedded || "local-unreleased";
  }

  return {
    applicationSha,
    deployedSha: applicationSha,
    buildIdentitySource: input.buildIdentitySource,
    buildIdentityCapturedAt: input.buildIdentityCapturedAt,
    deploymentSourceSha: railway && FULL_SHA.test(railway) ? railway : null,
    documentationHead: docs && FULL_SHA.test(docs) ? docs : null,
  };
}
