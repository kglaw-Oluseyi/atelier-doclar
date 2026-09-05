import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SessionError,
  loadCurrentSnapshot,
  readSession,
  type SessionActor,
} from "@maison-doclar/programme-tower";
import { sessionConfig } from "./config";

export async function requireTowerSession(): Promise<
  { actor: SessionActor; snapshot: ReturnType<typeof loadCurrentSnapshot> } | { denied: true }
> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    return { actor, snapshot: loadCurrentSnapshot() };
  } catch (error) {
    if (error instanceof SessionError) return { denied: true };
    throw error;
  }
}
