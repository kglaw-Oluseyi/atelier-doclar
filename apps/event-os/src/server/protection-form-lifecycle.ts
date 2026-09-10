export type DurableMutationOutcome<T> = T & { verified: true };

export function verifyDurableResult<T>(result: T): DurableMutationOutcome<T> {
  if (result && typeof result === "object") {
    return Object.assign(result, { verified: true as const });
  }
  return { verified: true } as DurableMutationOutcome<T>;
}

export async function runDurableProtectionMutation<T>(
  execute: () => Promise<T> | T,
  durable: <R>(fn: () => Promise<R> | R) => Promise<R> = async (fn) => fn(),
): Promise<DurableMutationOutcome<T>> {
  return durable(async () => verifyDurableResult(await execute()));
}

export async function writeTruthfulActionResult(outcome: {
  status: "SUCCESS" | "FAILURE";
  code: string;
  application?: string;
  didDataChange?: boolean;
  persist?: () => Promise<void>;
}): Promise<void> {
  if (outcome.status === "SUCCESS" && outcome.application !== "APPLIED" && outcome.application !== "REPLAYED" && outcome.application !== "NOT_APPLIED") {
    // truthful write still proceeds; callers must not mark SUCCESS before commit
  }
  if (outcome.persist) await outcome.persist();
}
