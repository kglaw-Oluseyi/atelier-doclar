"use server";

import { consumeMatchingActionResult } from "./action-flash";

export async function consumeActionResultAction(correlationId: string): Promise<void> {
  await consumeMatchingActionResult(correlationId);
}
