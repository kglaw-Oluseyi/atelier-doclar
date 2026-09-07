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
