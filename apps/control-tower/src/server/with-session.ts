import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SessionError,
  readSession,
  type SessionActor,
  type ControlSnapshot,
} from "@maison-doclar/programme-tower";
import { sessionConfig } from "./config";
import { loadProgrammeSnapshot } from "./runtime";

export async function requireTowerSession(): Promise<
  { actor: SessionActor; snapshot: ControlSnapshot } | { denied: true }
> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    return { actor, snapshot: await loadProgrammeSnapshot() };
  } catch (error) {
    if (error instanceof SessionError) return { denied: true };
    throw error;
  }
}
