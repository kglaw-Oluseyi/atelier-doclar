import { assessHealth, evaluateRuntimeConfig } from "@maison-doclar/programme-tower";
import { NextResponse } from "next/server";
import { ensureLiveReconcile, githubIngestionState, loadProgrammeSnapshot, usesProductionPersistence } from "../../../../server/runtime";

export async function GET(): Promise<Response> {
  const config = evaluateRuntimeConfig();
  try {
    if (config.githubLiveEnabled) await ensureLiveReconcile();
    const snapshot = await loadProgrammeSnapshot();
    const persistence = usesProductionPersistence() ? "AVAILABLE" : "LOCAL_ONLY";
    const githubIngestion = config.githubLiveEnabled
      ? githubIngestionState()
      : config.mode === "production"
        ? "UNCONFIGURED"
        : "SYNTHETIC";
    const health = assessHealth({
      snapshot,
      github: githubIngestion === "AVAILABLE" ? "AVAILABLE" : githubIngestion === "UNAVAILABLE" ? "UNAVAILABLE" : githubIngestion === "SYNTHETIC" ? "SYNTHETIC" : "UNKNOWN",
      githubIngestion: githubIngestion === "SYNTHETIC" || githubIngestion === "AVAILABLE" || githubIngestion === "UNAVAILABLE" || githubIngestion === "UNCONFIGURED" ? githubIngestion : "UNCONFIGURED",
      webhook: config.webhookConfigured ? "CONFIGURED" : "UNCONFIGURED",
      persistence,
      programmeData: snapshot.slices.length > 0 ? "AVAILABLE" : "UNAVAILABLE",
      productionReady: config.mode === "production" && config.ready && (!config.liveDeployment || persistence === "AVAILABLE"),
    });
    const ready =
      health.programmeData === "AVAILABLE" &&
      (config.mode !== "production" || config.ready) &&
      (!config.liveDeployment || persistence === "AVAILABLE");
    const body = {
      ready,
      mode: config.mode,
      failures: config.failures,
      applicationAlive: true,
      programmeData: health.programmeData,
      persistence,
      githubIngestion,
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
  } catch {
    return NextResponse.json(
      {
        ready: false,
        mode: config.mode,
        failures: [...config.failures, "live programme snapshot unavailable"],
        applicationAlive: true,
        programmeData: "UNAVAILABLE",
        persistence: usesProductionPersistence() ? "UNAVAILABLE" : "LOCAL_ONLY",
        githubIngestion: githubIngestionState(),
        webhook: config.webhookConfigured ? "CONFIGURED" : "UNCONFIGURED",
        rag: "UNAVAILABLE",
        unsignedProtectedGates: [],
        productionAuthorised: false,
        productionApproved: false,
      },
      { status: 503 },
    );
  }
}
