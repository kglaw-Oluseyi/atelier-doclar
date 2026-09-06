import { NextResponse } from "next/server";
import { deployedSha, fixturesAllowed, productionAuthorised } from "../../../../server/config";
import { ensureRuntime } from "../../../../server/runtime";

export async function GET(): Promise<Response> {
  try {
    const runtime = await ensureRuntime();
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
      },
      { status: 503 },
    );
  }
}
