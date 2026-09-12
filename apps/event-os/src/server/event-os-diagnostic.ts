import { createHash, timingSafeEqual } from "node:crypto";
import { monitorEventLoopDelay, performance, type IntervalHistogram } from "node:perf_hooks";

const SAMPLE_FLOOR_MS = 250;

function runtimeEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function fixturesAllowed(): boolean {
  return runtimeEnv("EVENT_OS_ALLOW_FIXTURES") === "1";
}

function productionAuthorised(): boolean {
  return runtimeEnv("EVENT_OS_PRODUCTION_AUTHORISED") === "true";
}

export function diagnosticToken(): string | undefined {
  return runtimeEnv("EVENT_OS_DIAGNOSTIC_TOKEN");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

const lastSampleByToken = new Map<string, number>();

export function diagnosticGate(headerToken: string | undefined): "UNAVAILABLE" | "DENIED" | "RATE_LIMITED" | "OK" {
  if (productionAuthorised() || !fixturesAllowed()) return "UNAVAILABLE";
  const expected = diagnosticToken();
  if (!expected) return "UNAVAILABLE";
  if (!headerToken || !safeEqual(headerToken, expected)) return "DENIED";
  const tokenKey = createHash("sha256").update(expected).digest("hex");
  const now = Date.now();
  const previous = lastSampleByToken.get(tokenKey) ?? 0;
  if (now - previous < SAMPLE_FLOOR_MS) return "RATE_LIMITED";
  lastSampleByToken.set(tokenKey, now);
  return "OK";
}

export function diagnosticHeaderToken(request: Request): string | undefined {
  return request.headers.get("x-event-os-diagnostic-token")?.trim() || undefined;
}

export function diagnosticUnavailableResponse(): Response {
  return new Response(null, { status: 404 });
}

let histogram: IntervalHistogram | undefined;
let lastElu = performance.eventLoopUtilization();
let lastMonoNs = process.hrtime.bigint();
let lastWallMs = Date.now();

function ensureHistogram(): IntervalHistogram {
  if (!histogram) {
    histogram = monitorEventLoopDelay({ resolution: 20 });
    histogram.enable();
  }
  return histogram;
}

export function hashedInstanceDiscriminator(): string {
  return createHash("sha256")
    .update("event-os-diag-instance")
    .update(runtimeEnv("RAILWAY_REPLICA_ID") ?? runtimeEnv("RAILWAY_DEPLOYMENT_ID") ?? "local")
    .digest("hex")
    .slice(0, 16);
}

export interface EventLoopDiagnostic {
  ok: true;
  instance: string;
  sampleAgeMs: number;
  lagP50Ms: number;
  lagP99Ms: number;
  lagMaxMs: number;
  driftMs: number;
  utilization: number;
}

export function sampleEventLoop(): EventLoopDiagnostic {
  const hist = ensureHistogram();
  const nowNs = process.hrtime.bigint();
  const nowMs = Date.now();
  const elapsedMs = Number(nowNs - lastMonoNs) / 1_000_000;
  const wallElapsed = nowMs - lastWallMs;
  const driftMs = Math.round((wallElapsed - elapsedMs) * 10) / 10;
  const utilization = performance.eventLoopUtilization(lastElu).utilization;
  lastElu = performance.eventLoopUtilization();
  lastMonoNs = nowNs;
  lastWallMs = nowMs;
  const sample: EventLoopDiagnostic = {
    ok: true,
    instance: hashedInstanceDiscriminator(),
    sampleAgeMs: Math.round(elapsedMs),
    lagP50Ms: Math.round(hist.percentile(50) / 1e6),
    lagP99Ms: Math.round(hist.percentile(99) / 1e6),
    lagMaxMs: Math.round(hist.max / 1e6),
    driftMs,
    utilization: Math.round(utilization * 1000) / 1000,
  };
  hist.reset();
  return sample;
}
