import { AsyncLocalStorage } from "node:async_hooks";

export type SeatingSettlementStage =
  | "HTTP_RECEIVED"
  | "ACTION_ENTER"
  | "TX_BEGIN"
  | "RUN_QUEUED"
  | "ACTION_RESULT_WRITTEN"
  | "TX_COMMIT"
  | "TX_ROLLBACK"
  | "SOLVER_START"
  | "SOLVER_TERMINAL"
  | "REDIRECT_EMITTED"
  | "HTTP_RESPONSE"
  | "RENDER_RESULT_FOUND"
  | "RENDER_RESULT_MISSING";

export interface SeatingSettlementTrace {
  stage: SeatingSettlementStage;
  commandId: string;
  requestId?: string;
  runId?: string;
  resultId?: string;
  commandType?: string;
  eventId?: string;
  attempt?: number;
  wallMs: number;
  monoNs?: string;
  durationMs?: number;
  outcome?: "APPLIED" | "REPLAYED" | "NOT_APPLIED";
  reasonClass?: string;
  transactionLabel?: string;
  workerExitCode?: number;
  acquireMs?: number;
  poolTotal?: number;
  poolIdle?: number;
  poolWaiting?: number;
}

type SettlementContext = {
  commandId: string;
  requestId: string;
  commandType?: string;
  eventId?: string;
  resultId?: string;
  startedMs: number;
  startedNs: bigint;
};

const storage = new AsyncLocalStorage<SettlementContext>();
const RING_LIMIT = 400;
const ring: SeatingSettlementTrace[] = [];

function uuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export function settlementCommandIdFromIdempotency(idempotencyKey: string | undefined, fallback: string): string {
  return uuid(idempotencyKey) ? idempotencyKey : fallback;
}

export function currentSettlementContext(): SettlementContext | undefined {
  return storage.getStore();
}

export function bindSettlementResult(resultId: string): void {
  const current = storage.getStore();
  if (current && uuid(resultId)) current.resultId = resultId;
}

export function runWithSettlementTrace<T>(
  input: { commandId: string; requestId: string; commandType?: string; eventId?: string },
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return storage.run(
    {
      commandId: input.commandId,
      requestId: input.requestId,
      commandType: input.commandType,
      eventId: uuid(input.eventId) ? input.eventId : undefined,
      startedMs: Date.now(),
      startedNs: process.hrtime.bigint(),
    },
    fn,
  );
}

export function emitSettlementStage(
  input: Omit<SeatingSettlementTrace, "commandId" | "wallMs"> & { commandId?: string },
): SeatingSettlementTrace | undefined {
  const current = storage.getStore();
  const commandId = input.commandId ?? current?.commandId;
  if (!uuid(commandId)) return undefined;
  const startedMs = current?.startedMs ?? Date.now();
  const trace: SeatingSettlementTrace = {
    stage: input.stage,
    commandId,
    requestId: input.requestId ?? current?.requestId,
    runId: uuid(input.runId) ? input.runId : undefined,
    resultId: uuid(input.resultId) ? input.resultId : current?.resultId,
    commandType: input.commandType ?? current?.commandType,
    eventId: uuid(input.eventId) ? input.eventId : current?.eventId,
    attempt: input.attempt,
    wallMs: Date.now() - startedMs,
    monoNs: current ? (process.hrtime.bigint() - current.startedNs).toString() : undefined,
    durationMs: input.durationMs,
    outcome: input.outcome,
    reasonClass: input.reasonClass,
    transactionLabel: input.transactionLabel,
    workerExitCode: input.workerExitCode,
    acquireMs: input.acquireMs,
    poolTotal: input.poolTotal,
    poolIdle: input.poolIdle,
    poolWaiting: input.poolWaiting,
  };
  ring.push(trace);
  if (ring.length > RING_LIMIT) ring.splice(0, ring.length - RING_LIMIT);
  console.info(`md.seating.settlement ${JSON.stringify(trace)}`);
  return trace;
}

export function listSettlementTraces(input: { commandId?: string; resultId?: string; requestId?: string }): SeatingSettlementTrace[] {
  return ring.filter((item) => {
    if (uuid(input.commandId) && item.commandId === input.commandId) return true;
    if (uuid(input.resultId) && item.resultId === input.resultId) return true;
    if (uuid(input.requestId) && item.requestId === input.requestId) return true;
    return false;
  });
}

export function clearSettlementTraces(): void {
  ring.length = 0;
}

export async function withSettlementTransaction<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  emitSettlementStage({ stage: "TX_BEGIN", transactionLabel: label });
  try {
    const result = await fn();
    emitSettlementStage({ stage: "TX_COMMIT", transactionLabel: label, durationMs: Date.now() - started });
    return result;
  } catch (error) {
    emitSettlementStage({ stage: "TX_ROLLBACK", transactionLabel: label, durationMs: Date.now() - started });
    throw error;
  }
}
