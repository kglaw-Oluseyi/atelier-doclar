import { loadConfig, readiness } from "@maison-doclar/foundation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = loadConfig();
  try {
    const ready = await readiness();
    return NextResponse.json({
      status: ready.database === "ok" && ready.migrations === "APPLIED" ? "ready" : "unavailable",
      persistence: "POSTGRES",
      schema: config.schema,
      migrations: ready.migrations,
      productionAuthorised: false,
    });
  } catch {
    return NextResponse.json(
      { status: "unavailable", productionAuthorised: false },
      { status: 503 },
    );
  }
}
