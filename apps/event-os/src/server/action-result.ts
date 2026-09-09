import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { PLATFORM_ERROR_CODES, type PlatformErrorCode } from "@maison-doclar/shared-platform";
import {
  isPlatformErrorCode,
  operationalStateFromCode,
  successCopy,
  type OperationalStateView,
} from "./operational-state";

export const ACTION_RESULT_COOKIE = "md_event_os_action_state";
export const ACTION_RESULT_MAX_AGE_SECONDS = 90;
export const ACTION_RESULT_QUERY = "result";

export type ActionResultStatus = "SUCCESS" | "FAILURE";

export interface ActionResult {
  v: 1;
  sessionHash: string;
  actorPersonId: string;
  scopePath: string;
  actionType: string;
  correlationId: string;
  status: ActionResultStatus;
  code: PlatformErrorCode | "SUCCESS";
  message: string;
  createdAt: string;
  eventId?: string;
  guestId?: string;
}

export interface PresentedActionResult {
  view?: OperationalStateView;
  shouldConsume: boolean;
  mutationLocked: boolean;
  actionType?: string;
  correlationId?: string;
  status?: ActionResultStatus;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION_TYPE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const SCOPE_PATH = /^\/app(?:\/[A-Za-z0-9._~-]+)*$/;
const FORBIDDEN_MESSAGE = /password|secret|token|stack|-----begin|record body/i;

export function sessionHashFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export function actionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    "forecast.run": "Run attendance forecast",
    "forecast.override.propose": "Propose forecast override",
    "forecast.override.decide": "Decide forecast override",
    "provision.propose": "Propose operational provision",
    "provision.decide": "Decide operational provision",
    "forecast.host.approve": "Approve host projection",
    "forecast.calibrate": "Record shadow calibration",
    "forecast.evaluate": "Evaluate forecast",
    "forecast.parameters.create": "Record event parameter set",
    "guest.amend": "Amend guest record",
    "guest.intake": "Create operational guest",
    "guest.addressing": "Save structured addressing",
    "access.manage": "Administer access",
    "academy.submit": "Submit academy assessment",
    "programme.mutate": "Update programme",
    "merchandise.mutate": "Update merchandise",
    "atelier.publish": "Publish private Atelier",
    "atelier.narrative.publish": "Publish narrative edition",
    "atelier.narrative.revise": "Start narrative revision",
    "atelier.decision.publish": "Publish host decision",
    "atelier.access.issue": "Issue host access",
    "atelier.access.renew": "Renew host access",
    "atelier.access.step-up": "Issue step-up confirmation",
    "atelier.access.revoke": "Revoke host access",
    "atelier.decision.review": "Review host decision",
    "atelier.update.publish": "Publish host update",
    "language.preference.record": "Record language preference",
    "language.cultural.create": "Create cultural source text",
    "language.cultural.decide": "Decide cultural source text",
    "language.translation.create": "Draft translation",
    "language.translation.decide": "Review translation",
    "language.assembly.preview": "Preview recipient assembly",
    "language.source.revise": "Start source revision",
    "language.source.submit": "Submit source revision",
    "language.source.decide": "Review source revision",
    "venue.create": "Register venue",
    "venue.fact.record": "Record venue fact",
    "venue.fact.verify": "Verify venue fact",
    "venue.adopt": "Adopt venue",
    "venue.event.override": "Record event venue override",
    "layout.create": "Create blank layout",
    "layout.update": "Update layout setup",
    "layout.command": "Apply spatial command",
    "layout.lease": "Acquire layout lease",
    "engagement.create": "Open enquiry",
    "discovery.start": "Start discovery",
    "discovery.consent": "Record consent",
    "discovery.session": "Update interview session",
    "discovery.source": "Record source note",
    "discovery.extract": "Extract candidate assertions",
    "discovery.review": "Review candidate assertion",
    "discovery.conflict": "Resolve contradiction",
    "discovery.participant": "Add discovery participant",
    "discovery.opportunity": "Update enquiry",
    "brief.draft": "Create working brief",
    "brief.submit": "Submit brief edition",
    "brief.decide": "Decide brief edition",
    "brief.publish": "Publish brief edition",
    "brief.client_access": "Issue client review access",
    "discovery.client_access.revoke": "Revoke client conversation access",
    "engagement.convert": "Convert engagement",
    "budget.calculate": "Calculate budget scenario",
    "budget.decide": "Decide budget scenario",
    "roadmap.instantiate": "Instantiate roadmap",
    "change.detect": "Record change proposal",
    "change.assess": "Assess change impact",
    "change.decide": "Decide change proposal",
    "command.view": "Review executive command",
    "evaluation.run": "Run fixture assurance",
  };
  return labels[actionType] ?? actionType.replaceAll(".", " ");
}

export function actionResultHasNoSecrets(result: ActionResult): boolean {
  const blob = JSON.stringify(result);
  if (blob.includes("    at ")) return false;
  if (FORBIDDEN_MESSAGE.test(blob)) return false;
  if (blob.includes("accessToken") || blob.includes("sessionToken")) return false;
  return true;
}

export function resultQueryIsSafe(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const [key, value] of params.entries()) {
    if (key === ACTION_RESULT_QUERY) {
      if (!UUID.test(value)) return false;
      continue;
    }
    if (key === "ok" || key === "state" || key === "error") return false;
    if (FORBIDDEN_MESSAGE.test(value) || value.includes("{") || value.length > 80) return false;
  }
  return true;
}

export function resultHref(scopePath: string, correlationId: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set(ACTION_RESULT_QUERY, correlationId);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (key === "ok" || key === "state" || key === "error" || key === ACTION_RESULT_QUERY) continue;
    if (!value) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${scopePath}?${query}` : scopePath;
}

function scopedId(value: unknown): string | undefined {
  return typeof value === "string" && UUID.test(value) ? value : undefined;
}

function isSafeMessage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 400 &&
    !value.includes("    at ") &&
    !FORBIDDEN_MESSAGE.test(value)
  );
}

export function parseActionResultPayload(raw: unknown): ActionResult | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const parsed = raw as Record<string, unknown>;
  if (parsed.v !== 1) return undefined;
  if (typeof parsed.sessionHash !== "string" || !/^[0-9a-f]{32}$/.test(parsed.sessionHash)) return undefined;
  if (typeof parsed.actorPersonId !== "string" || parsed.actorPersonId.length > 80) return undefined;
  if (typeof parsed.scopePath !== "string" || !SCOPE_PATH.test(parsed.scopePath)) return undefined;
  if (typeof parsed.actionType !== "string" || !ACTION_TYPE.test(parsed.actionType)) return undefined;
  if (typeof parsed.correlationId !== "string" || !UUID.test(parsed.correlationId)) return undefined;
  if (parsed.status !== "SUCCESS" && parsed.status !== "FAILURE") return undefined;
  if (parsed.status === "SUCCESS") {
    if (parsed.code !== "SUCCESS") return undefined;
  } else if (typeof parsed.code !== "string" || !isPlatformErrorCode(parsed.code)) {
    return undefined;
  }
  if (!isSafeMessage(parsed.message)) return undefined;
  if (typeof parsed.createdAt !== "string" || Number.isNaN(Date.parse(parsed.createdAt))) return undefined;
  const eventId = scopedId(parsed.eventId);
  const guestId = scopedId(parsed.guestId);
  const result: ActionResult = {
    v: 1,
    sessionHash: parsed.sessionHash,
    actorPersonId: parsed.actorPersonId,
    scopePath: parsed.scopePath,
    actionType: parsed.actionType,
    correlationId: parsed.correlationId,
    status: parsed.status,
    code: parsed.code as PlatformErrorCode | "SUCCESS",
    message: parsed.message,
    createdAt: parsed.createdAt,
    ...(eventId ? { eventId } : {}),
    ...(guestId ? { guestId } : {}),
  };
  if (!actionResultHasNoSecrets(result)) return undefined;
  if (result.status === "SUCCESS" && result.code !== "SUCCESS") return undefined;
  if (result.status === "FAILURE" && result.code === "SUCCESS") return undefined;
  return result;
}

function encodeSegment(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeSegment(value: string): string | undefined {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

export function signActionResult(result: ActionResult, secret: string): string {
  const payload = encodeSegment(JSON.stringify(result));
  const mac = createHmac("sha256", secret).update(`v1.${payload}`).digest("base64url");
  return `v1.${payload}.${mac}`;
}

export function verifyActionResult(cookie: string | undefined, secret: string): ActionResult | undefined {
  if (!cookie || !secret) return undefined;
  const parts = cookie.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return undefined;
  const [, payload, mac] = parts;
  if (!payload || !mac) return undefined;
  const expected = createHmac("sha256", secret).update(`v1.${payload}`).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
  const json = decodeSegment(payload);
  if (!json) return undefined;
  try {
    return parseActionResultPayload(JSON.parse(json));
  } catch {
    return undefined;
  }
}

export function scopeAllowsPath(scopePath: string, requestPath: string): boolean {
  const request = requestPath.split("?")[0] ?? requestPath;
  if (request === scopePath) return true;
  if (request.startsWith(`${scopePath}/`)) return true;
  const scopeTail = scopePath.split("/").filter(Boolean).pop()?.toLowerCase();
  const requestTail = request.split("/").filter(Boolean).pop()?.toLowerCase();
  if (scopePath.startsWith("/app/academy/") && request.startsWith("/app/academy/") && scopeTail && requestTail) {
    return scopeTail === requestTail;
  }
  return false;
}

function viewFromResult(result: ActionResult): OperationalStateView {
  const view =
    result.status === "SUCCESS"
      ? operationalStateFromCode("SUCCESS", result.message)
      : operationalStateFromCode(result.code as PlatformErrorCode, result.message);
  return {
    ...view,
    actionType: result.actionType,
    actionLabel: actionLabel(result.actionType),
    correlationId: result.correlationId,
    resultStatus: result.status,
  };
}

const RECENT_RESULTS = new Map<string, { result: ActionResult; expiresAt: number }>();
const RECENT_RESULT_TTL_MS = ACTION_RESULT_MAX_AGE_SECONDS * 1000;

export function rememberActionResult(result: ActionResult): void {
  RECENT_RESULTS.set(result.correlationId, {
    result,
    expiresAt: Date.now() + RECENT_RESULT_TTL_MS,
  });
}

export function recallActionResult(correlationId: string | undefined): ActionResult | undefined {
  if (!correlationId || !UUID.test(correlationId)) return undefined;
  const row = RECENT_RESULTS.get(correlationId);
  if (!row) return undefined;
  if (row.expiresAt <= Date.now()) {
    RECENT_RESULTS.delete(correlationId);
    return undefined;
  }
  return row.result;
}

export function forgetActionResult(correlationId: string | undefined): void {
  if (correlationId) RECENT_RESULTS.delete(correlationId);
}

export function storedResultMatchesCorrelation(
  stored: ActionResult | undefined,
  correlationId: string | undefined,
): boolean {
  return Boolean(stored && correlationId && UUID.test(correlationId) && stored.correlationId === correlationId);
}

export function presentActionResult(input: {
  stored?: ActionResult;
  sessionHash: string;
  actorPersonId: string;
  requestPath: string;
  resultId?: string;
  guestId?: string;
  eventId?: string;
}): PresentedActionResult {
  const stored = input.stored;
  if (!stored) {
    return { shouldConsume: false, mutationLocked: false };
  }
  if (stored.sessionHash !== input.sessionHash) return { shouldConsume: false, mutationLocked: false };
  if (stored.actorPersonId !== input.actorPersonId) return { shouldConsume: false, mutationLocked: false };
  if (!scopeAllowsPath(stored.scopePath, input.requestPath)) return { shouldConsume: false, mutationLocked: false };
  if (input.resultId && input.resultId !== stored.correlationId) return { shouldConsume: false, mutationLocked: false };
  if (!input.resultId) return { shouldConsume: false, mutationLocked: false };
  if (stored.eventId && input.eventId && stored.eventId !== input.eventId) {
    return { shouldConsume: false, mutationLocked: false };
  }
  if (stored.guestId && input.guestId && stored.guestId !== input.guestId) {
    return { shouldConsume: false, mutationLocked: false };
  }
  const conflict = stored.status === "FAILURE" && stored.code === "VERSION_CONFLICT";
  return {
    view: viewFromResult(stored),
    shouldConsume: !conflict,
    mutationLocked: conflict,
    actionType: stored.actionType,
    correlationId: stored.correlationId,
    status: stored.status,
  };
}

export function buildActionResult(input: {
  sessionHash: string;
  actorPersonId: string;
  scopePath: string;
  actionType: string;
  correlationId: string;
  status: ActionResultStatus;
  code: PlatformErrorCode | "SUCCESS";
  message: string;
  eventId?: string;
  guestId?: string;
  createdAt?: string;
}): ActionResult {
  const parsed = parseActionResultPayload({
    v: 1,
    sessionHash: input.sessionHash,
    actorPersonId: input.actorPersonId,
    scopePath: input.scopePath,
    actionType: input.actionType,
    correlationId: input.correlationId,
    status: input.status,
    code: input.code,
    message: input.message.slice(0, 400),
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.guestId ? { guestId: input.guestId } : {}),
  });
  if (!parsed) {
    throw new Error("action result payload was refused");
  }
  return parsed;
}

export function successMessageForOk(ok: string): string {
  return successCopy(ok);
}

export const ACTION_RESULT_PLATFORM_CODES = PLATFORM_ERROR_CODES;
