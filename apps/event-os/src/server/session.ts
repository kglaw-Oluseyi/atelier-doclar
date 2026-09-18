import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadConfig, resolveSession, type ActorState } from "@maison-doclar/foundation";

export async function readSession(): Promise<{ sessionId: string; actor: ActorState } | null> {
  const token = cookies().get("eos_session")?.value;
  if (!token) return null;
  const config = loadConfig();
  return resolveSession(token, config.sessionSecret);
}

export async function requireActor(): Promise<{ sessionId: string; actor: ActorState }> {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (session.actor.userStatus === "SUSPENDED") redirect("/access-denied?reason=suspended");
  if (session.actor.userStatus !== "ACTIVE" || session.actor.membershipStatus !== "ACTIVE")
    redirect("/access-pending");
  const active = session.actor.assignments.some((grant) => grant.status === "ACTIVE");
  if (!active) redirect("/access-pending");
  return session;
}

export function correlationId(): string {
  return crypto.randomUUID();
}
