import { NextResponse } from "next/server";
import { deployedSha, fixturesAllowed, productionAuthorised } from "../../../../server/config";
import { createLayoutBinaryStoreFromEnv, probeLayoutAssetStore } from "../../../../server/layout-s3-store";
import { ensureRuntime } from "../../../../server/runtime";

export async function GET(): Promise<Response> {
  try {
    const runtime = await ensureRuntime();
    const layoutAssetStore = await probeLayoutAssetStore(createLayoutBinaryStoreFromEnv());
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
    });
  } catch {
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
      },
      { status: 503 },
    );
  }
}
