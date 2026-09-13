const SCHEDULED = new Set<string>();

export function shouldScheduleActionResultConsume(correlationId: string | undefined): boolean {
  if (!correlationId || SCHEDULED.has(correlationId)) return false;
  SCHEDULED.add(correlationId);
  return true;
}

export function resetActionResultConsumeScheduleForTests(): void {
  SCHEDULED.clear();
}
