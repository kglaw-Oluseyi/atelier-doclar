import { cookies } from "next/headers";
import {
  PlatformError,
  SESSION_COOKIE,
  readSession,
  type ActorContext,
  type Person,
} from "@maison-doclar/shared-platform";
import { fixturesAllowed, sessionConfig } from "./config";
import { getRuntime } from "./runtime";

export async function requireActor(): Promise<{ actor: ActorContext; person: Person }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = readSession(token, sessionConfig());
  const runtime = getRuntime();
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
