import "server-only";
import { cookies } from "next/headers";
import { cookieSecure, sessionConfig } from "./config";
import {
  ACTION_RESULT_COOKIE,
  ACTION_RESULT_MAX_AGE_SECONDS,
  buildActionResult,
  forgetActionResult,
  presentActionResult,
  recallActionResult,
  rememberActionResult,
  resolveStoredActionResult,
  sessionHashFromToken,
  storedResultMatchesCorrelation,
  signActionResult,
  verifyActionResult,
  type ActionResult,
  type PresentedActionResult,
} from "./action-result";
import { parseActionFlash, type ActionFlash } from "./operational-state";
import { readStaffSessionCookie } from "./staff-session-cookie";

export type { ActionFlash, ActionResult, PresentedActionResult };
export { parseActionFlash, presentActionResult, sessionHashFromToken };

export function actionResultClearCookie(secure = cookieSecure()) {
  return {
    name: ACTION_RESULT_COOKIE,
    value: "",
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    secure,
  };
}

function actionResultSetCookie(value: string) {
  return {
    name: ACTION_RESULT_COOKIE,
    value,
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACTION_RESULT_MAX_AGE_SECONDS,
    secure: cookieSecure(),
  };
}

export async function writeActionResult(result: ActionResult): Promise<void> {
  rememberActionResult(result);
  const signed = signActionResult(result, sessionConfig().sessionSecret);
  (await cookies()).set(actionResultSetCookie(signed));
}

export async function consumeActionFlash(): Promise<void> {
  const stored = await readActionResult();
  forgetActionResult(stored?.correlationId);
  (await cookies()).set(actionResultClearCookie());
}

export async function consumeMatchingActionResult(correlationId: string): Promise<void> {
  const cookie = await readActionResult();
  const stored = cookie?.correlationId === correlationId ? cookie : recallActionResult(correlationId);
  if (!storedResultMatchesCorrelation(stored, correlationId)) return;
  forgetActionResult(correlationId);
  if (cookie?.correlationId === correlationId) {
    (await cookies()).set(actionResultClearCookie());
  }
}

export async function consumeActionResult(): Promise<void> {
  await consumeActionFlash();
}

export async function readActionResult(): Promise<ActionResult | undefined> {
  const raw = (await cookies()).get(ACTION_RESULT_COOKIE)?.value;
  return verifyActionResult(raw, sessionConfig().sessionSecret);
}

export async function writeActionFlash(flash: ActionFlash & {
  actionType: string;
  scopePath: string;
  correlationId: string;
  actorPersonId: string;
  sessionHash: string;
  status?: "SUCCESS" | "FAILURE";
}): Promise<void> {
  const status: "SUCCESS" | "FAILURE" = flash.status ?? "FAILURE";
  await writeActionResult(
    buildActionResult({
      sessionHash: flash.sessionHash,
      actorPersonId: flash.actorPersonId,
      scopePath: flash.scopePath,
      actionType: flash.actionType,
      correlationId: flash.correlationId,
      status,
      code: status === "SUCCESS" ? "SUCCESS" : flash.code,
      message: flash.message,
      eventId: flash.eventId,
      guestId: flash.guestId,
    }),
  );
}

export async function readActionFlash(): Promise<ActionFlash | undefined> {
  const result = await readActionResult();
  if (!result || result.status !== "FAILURE" || result.code === "SUCCESS") return undefined;
  return {
    code: result.code,
    message: result.message,
    ...(result.eventId ? { eventId: result.eventId } : {}),
    ...(result.guestId ? { guestId: result.guestId } : {}),
  };
}

export async function loadPresentedActionResult(input: {
  requestPath: string;
  resultId?: string;
  actorPersonId: string;
  eventId?: string;
  guestId?: string;
  organisationId?: string;
}): Promise<PresentedActionResult> {
  const token = (await readStaffSessionCookie()) ?? "";
  const cookie = await readActionResult();
  const queryStored = recallActionResult(input.resultId);
  const stored = resolveStoredActionResult({
    queryStored,
    cookie,
    requestPath: input.requestPath,
    resultId: input.resultId,
  });
  return presentActionResult({
    stored,
    sessionHash: sessionHashFromToken(token),
    actorPersonId: input.actorPersonId,
    requestPath: input.requestPath,
    resultId: input.resultId ?? (stored && stored.scopePath === input.requestPath ? stored.correlationId : undefined),
    eventId: input.eventId,
    guestId: input.guestId,
    organisationId: input.organisationId,
  });
}

export async function writeRecoveredMarker(input: { eventId: string; guestId: string }): Promise<void> {
  (await cookies()).set({
    name: "md_event_os_recovered",
    value: JSON.stringify({ eventId: input.eventId, guestId: input.guestId }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: cookieSecure(),
  });
}

export async function readRecoveredMarker(): Promise<{ eventId: string; guestId: string } | undefined> {
  const raw = (await cookies()).get("md_event_os_recovered")?.value;
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
  kind: "guest" | "vendor" | "atelier";
  token: string;
  subjectId: string;
};

const ISSUED_DISCOVERY_COOKIE = "md_event_os_issued_discovery";
const RECENT_ISSUED_DISCOVERY = new Map<string, { path: string; expiresAt: number }>();
const ISSUED_DISCOVERY_TTL_MS = 300_000;

function isDiscoveryPath(path: string): boolean {
  return /^\/discover\/[0-9a-f-]{36}$/i.test(path);
}

export function rememberIssuedDiscoveryPath(key: string, path: string): void {
  if (!key || !isDiscoveryPath(path)) return;
  RECENT_ISSUED_DISCOVERY.set(key, { path, expiresAt: Date.now() + ISSUED_DISCOVERY_TTL_MS });
}

export function recallIssuedDiscoveryPath(key: string): string | undefined {
  const row = RECENT_ISSUED_DISCOVERY.get(key);
  if (!row || row.expiresAt <= Date.now()) {
    if (row) RECENT_ISSUED_DISCOVERY.delete(key);
    return undefined;
  }
  return row.path;
}

export async function writeIssuedDiscoveryPath(path: string, key?: string): Promise<void> {
  if (!isDiscoveryPath(path)) return;
  if (key) rememberIssuedDiscoveryPath(key, path);
  (await cookies()).set({
    name: ISSUED_DISCOVERY_COOKIE,
    value: path,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: cookieSecure(),
  });
}

export async function readIssuedDiscoveryPath(key?: string): Promise<string | undefined> {
  const remembered = key ? recallIssuedDiscoveryPath(key) : undefined;
  if (remembered) return remembered;
  const raw = (await cookies()).get(ISSUED_DISCOVERY_COOKIE)?.value;
  return raw && isDiscoveryPath(raw) ? raw : undefined;
}

export async function writeIssuedAccessFlash(flash: IssuedAccessFlash): Promise<void> {
  (await cookies()).set({
    name: ISSUED_ACCESS_COOKIE,
    value: JSON.stringify({ kind: flash.kind, token: flash.token, subjectId: flash.subjectId }),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 120,
    secure: cookieSecure(),
  });
}

export async function readIssuedAccessFlash(): Promise<IssuedAccessFlash | undefined> {
  const raw = (await cookies()).get(ISSUED_ACCESS_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { kind?: unknown; token?: unknown; subjectId?: unknown };
    if (parsed.kind !== "guest" && parsed.kind !== "vendor" && parsed.kind !== "atelier") return undefined;
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
    secure: cookieSecure(),
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
    secure: cookieSecure(),
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
