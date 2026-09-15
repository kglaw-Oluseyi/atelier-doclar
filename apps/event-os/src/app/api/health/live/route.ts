import { NextResponse } from "next/server";
import { applicationIdentity, deployedSha } from "../../../../server/config";

export async function GET(): Promise<Response> {
  const identity = applicationIdentity();
  return NextResponse.json({
    alive: true,
    service: "event-os",
    productionAuthorised: false,
    deployedSha: deployedSha(),
    applicationSha: identity.applicationSha,
    deploymentSourceSha: identity.deploymentSourceSha,
    documentationHead: identity.documentationHead,
    buildIdentitySource: identity.buildIdentitySource,
  });
}
