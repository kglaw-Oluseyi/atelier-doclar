import "server-only";
import {
  BUILD_APPLICATION_SHA,
  BUILD_IDENTITY_CAPTURED_AT,
  BUILD_IDENTITY_SOURCE,
} from "./build-identity.generated";
import { resolveApplicationIdentity, type ApplicationIdentity } from "./build-identity-resolve";

export type { ApplicationIdentity };
export { resolveApplicationIdentity };

export function currentApplicationIdentity(env: NodeJS.ProcessEnv = process.env): ApplicationIdentity {
  return resolveApplicationIdentity({
    buildEmbeddedSha: BUILD_APPLICATION_SHA,
    buildIdentitySource: BUILD_IDENTITY_SOURCE,
    buildIdentityCapturedAt: BUILD_IDENTITY_CAPTURED_AT,
    railwayGitCommitSha: env.RAILWAY_GIT_COMMIT_SHA,
    eventOsGitSha: env.EVENT_OS_GIT_SHA,
    documentationHead: env.EVENT_OS_DOCS_HEAD,
  });
}
