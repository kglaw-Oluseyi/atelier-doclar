import { NextResponse } from "next/server";
import { loadConfig, resolveSession } from "@maison-doclar/foundation";

export async function requireApiActor(
  request: Request,
): Promise<
  | { error: NextResponse; session?: undefined }
  | { error?: undefined; session: NonNullable<Awaited<ReturnType<typeof resolveSession>>> }
> {
  const config = loadConfig();
  const header = request.headers.get("cookie") ?? "";
  const token = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("eos_session="))
    ?.slice("eos_session=".length);
  if (!token)
    return {
      error: NextResponse.json({ code: "AUTH_REQUIRED", message: "Sign in." }, { status: 401 }),
    };
  const session = await resolveSession(decodeURIComponent(token), config.sessionSecret);
  if (!session)
    return {
      error: NextResponse.json({ code: "AUTH_REQUIRED", message: "Sign in." }, { status: 401 }),
    };
  return { session };
}
