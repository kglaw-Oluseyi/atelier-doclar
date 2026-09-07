import "server-only";
import { cookies } from "next/headers";
import { parseActionFlash, type ActionFlash } from "./operational-state";

const ACTION_FLASH_COOKIE = "md_event_os_action_state";
const RECOVERED_COOKIE = "md_event_os_recovered";

export type { ActionFlash };
export { parseActionFlash };

export async function writeActionFlash(flash: ActionFlash): Promise<void> {
  (await cookies()).set({
    name: ACTION_FLASH_COOKIE,
    value: JSON.stringify({
      code: flash.code,
      message: flash.message,
      ...(flash.eventId ? { eventId: flash.eventId } : {}),
      ...(flash.guestId ? { guestId: flash.guestId } : {}),
    }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function consumeActionFlash(): Promise<void> {
  (await cookies()).set({
    name: ACTION_FLASH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readActionFlash(): Promise<ActionFlash | undefined> {
  const jar = await cookies();
  return parseActionFlash(jar.get(ACTION_FLASH_COOKIE)?.value);
}

export async function writeRecoveredMarker(input: { eventId: string; guestId: string }): Promise<void> {
  (await cookies()).set({
    name: RECOVERED_COOKIE,
    value: JSON.stringify({ eventId: input.eventId, guestId: input.guestId }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readRecoveredMarker(): Promise<{ eventId: string; guestId: string } | undefined> {
  const raw = (await cookies()).get(RECOVERED_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { eventId?: unknown; guestId?: unknown };
    if (typeof parsed.eventId !== "string" || parsed.eventId.length > 80) return undefined;
    if (typeof parsed.guestId !== "string" || parsed.guestId.length > 80) return undefined;
    return { eventId: parsed.eventId, guestId: parsed.guestId };
  } catch {
    return undefined;
  }
}

const ISSUED_ACCESS_COOKIE = "md_event_os_issued_access";
const AUDIENCE_PREVIEW_COOKIE = "md_event_os_offer_preview";

export type IssuedAccessFlash = {
  kind: "guest" | "vendor";
  token: string;
  subjectId: string;
};

export async function writeIssuedAccessFlash(flash: IssuedAccessFlash): Promise<void> {
  (await cookies()).set({
    name: ISSUED_ACCESS_COOKIE,
    value: JSON.stringify({ kind: flash.kind, token: flash.token, subjectId: flash.subjectId }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readIssuedAccessFlash(): Promise<IssuedAccessFlash | undefined> {
  const raw = (await cookies()).get(ISSUED_ACCESS_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { kind?: unknown; token?: unknown; subjectId?: unknown };
    if (parsed.kind !== "guest" && parsed.kind !== "vendor") return undefined;
    if (typeof parsed.token !== "string" || parsed.token.length < 16 || parsed.token.length > 200) return undefined;
    if (typeof parsed.subjectId !== "string" || parsed.subjectId.length > 80) return undefined;
    return { kind: parsed.kind, token: parsed.token, subjectId: parsed.subjectId };
  } catch {
    return undefined;
  }
}

export async function consumeIssuedAccessFlash(): Promise<void> {
  (await cookies()).set({
    name: ISSUED_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function writeAudiencePreviewFlash(names: string[]): Promise<void> {
  (await cookies()).set({
    name: AUDIENCE_PREVIEW_COOKIE,
    value: JSON.stringify({ names: names.slice(0, 40) }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readAudiencePreviewFlash(): Promise<string[] | undefined> {
  const raw = (await cookies()).get(AUDIENCE_PREVIEW_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { names?: unknown };
    if (!Array.isArray(parsed.names)) return undefined;
    return parsed.names.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length < 160);
  } catch {
    return undefined;
  }
}
