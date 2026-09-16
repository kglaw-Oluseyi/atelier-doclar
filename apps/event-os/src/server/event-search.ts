/**
 * Client-safe event list filter. Matches name, code, or immutable id fragments.
 * Caller must already have permission-filtered events.
 */
export function filterEventsByQuery<T extends { id: string; name: string; code?: string }>(
  events: readonly T[],
  rawQuery: string | undefined | null,
): T[] {
  const q = (rawQuery ?? "").trim().toLowerCase();
  if (!q) return [...events];
  return events.filter((event) => {
    if (event.id.toLowerCase().includes(q)) return true;
    if (event.name.toLowerCase().includes(q)) return true;
    if ((event.code ?? "").toLowerCase().includes(q)) return true;
    return false;
  });
}

export function isSyntheticQualificationEvent(event: { code?: string; name: string }): boolean {
  const code = (event.code ?? "").toUpperCase();
  if (code === "CAP600" || code === "CAP1000") return true;
  return /synthetic\s+(stretch\s+)?qualification/i.test(event.name);
}
