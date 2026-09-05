import "server-only";
import {
  SYNTHETIC_ACCESS_TOKEN,
  SYNTHETIC_SESSION_SECRET,
  type SessionConfig,
} from "@maison-doclar/programme-tower";

export function sessionConfig(): SessionConfig {
  return {
    accessToken: process.env.PROGRAMME_ACCESS_TOKEN ?? SYNTHETIC_ACCESS_TOKEN,
    sessionSecret: process.env.PROGRAMME_SESSION_SECRET ?? SYNTHETIC_SESSION_SECRET,
  };
}

export function fixturesAllowed(): boolean {
  return process.env.PROGRAMME_ALLOW_FIXTURES === "1";
}

export function isProductionIdp(): boolean {
  return false;
}
