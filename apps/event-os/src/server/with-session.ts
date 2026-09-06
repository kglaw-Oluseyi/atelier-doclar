import { PlatformError, type ActorContext, type Person } from "@maison-doclar/shared-platform";
import { fixturesAllowed } from "./config";
import { ensureRuntime } from "./runtime";
import { readStaffSessionCookie } from "./staff-session-cookie";

export async function requireActor(): Promise<{ actor: ActorContext; person: Person }> {
  const token = await readStaffSessionCookie();
  let runtime;
  try {
    runtime = await ensureRuntime();
  } catch (error) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", error instanceof Error ? error.message : "runtime is not ready", {
      publicMessage: "Durable storage is not available. Canonical records were not changed.",
    });
  }
  const { actor: session } = runtime.service.requireStaffSession(token, testActorNow() ?? new Date().toISOString());
  const resolved = runtime.service.resolveActor(session.personId);
  if (resolved.assignments.every((item) => item.status !== "ACTIVE")) {
    throw new PlatformError("ACCESS_PENDING", "no active assignment");
  }
  return {
    person: resolved.person,
    actor: {
      personId: resolved.person.id,
      correlationId: crypto.randomUUID(),
      actorKind: "HUMAN",
      ...(testActorNow() ? { now: testActorNow() } : {}),
    },
  };
}

function testActorNow(): string | undefined {
  if (!fixturesAllowed()) return undefined;
  const fixed = process.env.EVENT_OS_TEST_NOW?.trim();
  return fixed || undefined;
}

export async function optionalActor(): Promise<{ actor: ActorContext; person: Person } | undefined> {
  try {
    return await requireActor();
  } catch {
    return undefined;
  }
}
