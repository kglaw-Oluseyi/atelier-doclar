export function envelope(formData: FormData) {
  return {
    organisationId: String(formData.get("organisationId") ?? ""),
    eventId: String(formData.get("eventId") ?? "") || undefined,
    assignmentId: String(formData.get("assignmentId") ?? ""),
    expectedVersion: Number(formData.get("expectedVersion") ?? 0),
    idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  };
}

export function scopePathFromForm(formData: FormData, fallback = "/app/protection"): string {
  const eventId = String(formData.get("eventId") ?? "");
  return eventId ? `/app/events/${eventId}/protection` : fallback;
}

export function dossierScopePathFromForm(formData: FormData, fallback = "/app/protection"): string {
  const eventId = String(formData.get("eventId") ?? "");
  return eventId ? `/app/events/${eventId}/protection/dossier` : fallback;
}

export function authorityDetailPathFromForm(formData: FormData, fallback = "/app/protection"): string {
  const raw = String(formData.get("returnPath") ?? "");
  return /^\/app\/protection\/authority\/[0-9a-f-]{36}$/i.test(raw) ? raw : fallback;
}
