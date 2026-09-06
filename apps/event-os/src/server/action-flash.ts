import "server-only";
import { cookies } from "next/headers";
import type { PlatformErrorCode } from "@maison-doclar/shared-platform";
import { parseActionFlash } from "./operational-state";

const ACTION_FLASH_COOKIE = "md_event_os_action_state";

export interface ActionFlash {
  code: PlatformErrorCode;
  message: string;
}

export { parseActionFlash };

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
