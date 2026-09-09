import { NextResponse } from "next/server";
import { deployedSha, fixturesAllowed, productionAuthorised } from "../../../../server/config";
import { createLayoutBinaryStoreFromEnv, probeLayoutAssetStore } from "../../../../server/layout-s3-store";
import { ensureRuntime } from "../../../../server/runtime";

export async function GET(): Promise<Response> {
  try {
    const runtime = await ensureRuntime();
    const layoutAssetStore = await probeLayoutAssetStore(createLayoutBinaryStoreFromEnv());
    const s05a = runtime.service.getS05AReadiness();
    return NextResponse.json({
      ready: runtime.persistence !== "UNAVAILABLE",
      persistence: runtime.persistence,
      databaseReady: runtime.persistence === "POSTGRES",
      migrationStatus: runtime.migrationStatus,
      identityAdapter: fixturesAllowed() ? "NON_PRODUCTION_FIXTURE" : "UNBOUND",
      fixtures: runtime.fixtures,
      productionAuthorised: productionAuthorised(),
      productionIdpSelected: false,
      deployedSha: deployedSha(),
      layoutAssetStore,
      layoutExport: layoutAssetStore === "READY" ? "READY" : layoutAssetStore,
      s05aInterviewCorpus: s05a.interviewCorpusEdition,
      s05aEvaluationStatus: s05a.evaluationStatus,
      s05aEvaluationBlocked: s05a.evaluationBlocked,
      s05aCalendarReady: s05a.calendarReady,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message.slice(0, 200) : "runtime boot failed";
    console.error("event-os ready failed", code, message);
    return NextResponse.json(
      {
        ready: false,
        persistence: "UNAVAILABLE",
        databaseReady: false,
        migrationStatus: "FAILED",
        identityAdapter: "UNBOUND",
        fixtures: false,
        productionAuthorised: false,
        productionIdpSelected: false,
        deployedSha: deployedSha(),
        layoutAssetStore: "UNAVAILABLE",
        layoutExport: "UNAVAILABLE",
        bootFailure: `${code}: ${message}`,
      },
      { status: 503 },
    );
  }
}
