import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE, TOWER_ROLES, type TowerRole } from "./constants.js";

export interface SessionActor {
  actorId: string;
  role: TowerRole;
  issuedAt: string;
  expiresAt: string;
}

export interface SessionConfig {
  accessToken: string;
  sessionSecret: string;
  ttlSeconds?: number;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isTowerRole(value: string): value is TowerRole {
  return (TOWER_ROLES as readonly string[]).includes(value);
}

export function issueSession(
  input: { actorId: string; role: TowerRole; accessToken: string; now?: string },
  config: SessionConfig,
): string {
  if (!config.accessToken || !safeEqual(input.accessToken, config.accessToken)) {
    throw new SessionError("INVALID_TOKEN", "access token is not valid");
  }
  if (!input.actorId.trim() || input.actorId === "UNKNOWN" || input.actorId.toLowerCase() === "cursor") {
    throw new SessionError("INVALID_ACTOR", "actor must be a named identity; UNKNOWN/Cursor are forbidden");
  }
  const now = input.now ?? new Date().toISOString();
  const ttl = config.ttlSeconds ?? 8 * 60 * 60;
  const expiresAt = new Date(Date.parse(now) + ttl * 1000).toISOString();
  const actor: SessionActor = {
    actorId: input.actorId.trim(),
    role: input.role,
    issuedAt: now,
    expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return `${payload}.${sign(payload, config.sessionSecret)}`;
}

export function readSession(token: string | undefined, config: SessionConfig, now = new Date().toISOString()): SessionActor {
  if (!token) throw new SessionError("UNAUTHENTICATED", "session is missing");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new SessionError("INVALID_SESSION", "session is malformed");
  }
  const [payload, signature] = parts;
  const expected = sign(payload, config.sessionSecret);
  if (!safeEqual(signature, expected)) {
    throw new SessionError("INVALID_SESSION", "session signature is invalid");
  }
  let actor: SessionActor;
  try {
    actor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionActor;
  } catch {
    throw new SessionError("INVALID_SESSION", "session payload is malformed");
  }
  if (!actor.actorId || !isTowerRole(actor.role) || !actor.expiresAt) {
    throw new SessionError("INVALID_SESSION", "session payload is incomplete");
  }
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new SessionError("EXPIRED_SESSION", "session has expired");
  }
  return actor;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export class SessionError extends Error {
  readonly code: "UNAUTHENTICATED" | "INVALID_TOKEN" | "INVALID_ACTOR" | "INVALID_SESSION" | "EXPIRED_SESSION";

  constructor(code: SessionError["code"], message: string) {
    super(message);
    this.name = "SessionError";
    this.code = code;
  }
}
