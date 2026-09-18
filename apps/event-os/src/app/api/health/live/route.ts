import { loadConfig } from "@maison-doclar/foundation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const config = loadConfig();
  return NextResponse.json({
    status: "live",
    productionAuthorised: config.productionAuthorised,
    deployedSha: config.gitSha,
    persistence: "POSTGRES",
    schema: config.schema,
  });
}
