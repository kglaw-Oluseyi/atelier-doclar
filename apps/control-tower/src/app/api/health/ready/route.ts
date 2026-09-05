import { assessHealth, evaluateRuntimeConfig, loadCurrentSnapshot } from "@maison-doclar/programme-tower";
import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  const config = evaluateRuntimeConfig();
  const snapshot = loadCurrentSnapshot();
  const health = assessHealth({
    snapshot,
    github: config.githubLiveEnabled ? "UNKNOWN" : "SYNTHETIC",
    githubIngestion: config.githubLiveEnabled ? (config.githubTokenPresent ? "AVAILABLE" : "UNCONFIGURED") : "SYNTHETIC",
    webhook: config.webhookConfigured ? "CONFIGURED" : "UNCONFIGURED",
    persistence: config.persistenceConfigured ? "LOCAL_ONLY" : "LOCAL_ONLY",
    programmeData: snapshot.slices.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
    productionReady: config.mode === "production" && config.ready,
  });
  const ready =
    health.programmeData === "AVAILABLE" &&
    (config.mode !== "production" || config.ready);
  const body = {
    ready,
    mode: config.mode,
    failures: config.failures,
    applicationAlive: true,
    programmeData: health.programmeData,
    persistence: health.persistence,
    githubIngestion: health.githubIngestion,
    webhook: health.webhook,
    rag: health.rag,
    unsignedProtectedGates: health.unsignedProtectedGates,
    productionAuthorised: false,
    productionApproved: false,
  };
  if (!ready) {
    return NextResponse.json(body, { status: 503 });
  }
  return NextResponse.json(body);
}
