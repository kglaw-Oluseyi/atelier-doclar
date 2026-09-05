import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({
    alive: true,
    service: "control-tower",
    productionAuthorised: false,
  });
}
