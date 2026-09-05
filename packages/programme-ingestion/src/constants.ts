export const CT3_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0004",
  nativeId: "CT3",
  sliceId: "MD-CT3",
} as const;

export const AUTHORISED_REPOSITORY = "kglaw-Oluseyi/atelier-doclar";
export const AUTHORISED_BRANCH = "main";
export const AUTHORISED_REF = "refs/heads/main";
export const TRUSTED_WORKFLOWS = ["programme-validate"] as const;

export const SUPPORTED_WEBHOOK_EVENTS = ["push", "workflow_run", "ping"] as const;

export const SYNTHETIC_WEBHOOK_SECRET = "ct3-synthetic-webhook-secret-not-for-production";
