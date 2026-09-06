import "server-only";
import { cookies } from "next/headers";
import type { PlatformErrorCode } from "@maison-doclar/shared-platform";
import { isPlatformErrorCode } from "./operational-state";

const ACTION_FLASH_COOKIE = "md_event_os_action_state";

export interface ActionFlash {
  code: PlatformErrorCode;
  message: string;
}

export async function writeActionFlash(flash: ActionFlash): Promise<void> {
  (await cookies()).set({
    name: ACTION_FLASH_COOKIE,
    value: JSON.stringify({ code: flash.code, message: flash.message }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readActionFlash(): Promise<ActionFlash | undefined> {
  const jar = await cookies();
  const raw = jar.get(ACTION_FLASH_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; message?: unknown };
    if (typeof parsed.code !== "string" || !isPlatformErrorCode(parsed.code)) return undefined;
    if (typeof parsed.message !== "string" || parsed.message.length > 400) return undefined;
    if (parsed.message.includes("    at ")) return undefined;
    return { code: parsed.code, message: parsed.message };
  } catch {
    return undefined;
  }
}
