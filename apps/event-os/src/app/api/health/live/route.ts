import { NextResponse } from "next/server";
import { deployedSha } from "../../../../server/config";

export async function GET(): Promise<Response> {
  return NextResponse.json({
    alive: true,
    service: "event-os",
    productionAuthorised: false,
    deployedSha: deployedSha(),
  });
}
