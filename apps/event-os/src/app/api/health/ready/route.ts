import { NextResponse } from "next/server";
import { fixturesAllowed, productionAuthorised } from "../../../../server/config";
import { persistenceLabel } from "../../../../server/runtime";

export async function GET(): Promise<Response> {
  try {
    return NextResponse.json({
      ready: fixturesAllowed(),
      persistence: persistenceLabel(),
      identityAdapter: fixturesAllowed() ? "NON_PRODUCTION_FIXTURE" : "UNBOUND",
      fixtures: fixturesAllowed(),
      productionAuthorised: productionAuthorised(),
      productionIdpSelected: false,
    });
  } catch {
    return NextResponse.json(
      {
        ready: false,
        persistence: "UNAVAILABLE",
        identityAdapter: "UNBOUND",
        fixtures: false,
        productionAuthorised: false,
        productionIdpSelected: false,
      },
      { status: 503 },
    );
  }
}
