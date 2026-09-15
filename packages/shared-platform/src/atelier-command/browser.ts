/** Browser-assisted executor — isolated simulation while productionAuthorised:false. */
import { createHash, randomUUID } from "node:crypto";
import { PlatformError } from "../errors.js";
import type { AtelierBrowserAction, AtelierBrowserRun } from "./types.js";

export const BROWSER_EXECUTOR_POLICY_VERSION = "eos-s06a-browser-sim-v1" as const;
export const DEFAULT_ALLOWED_DOMAINS = ["portal.venue.example", "portal.supplier.example"] as const;

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "Browser destination URL is invalid");
  }
}

export function assertDomainAllowed(url: string, allowed: readonly string[]): string {
  const host = hostnameOf(url);
  if (host === "localhost" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host === "0.0.0.0" || host.endsWith(".local")) {
    throw new PlatformError("FORBIDDEN", "Private, loopback and link-local browser targets are blocked");
  }
  if (!allowed.some((d) => host === d || host.endsWith(`.${d}`))) {
    throw new PlatformError("FORBIDDEN", "Browser destination is outside the approved allowlist");
  }
  return host;
}

export function detectBrowserPromptInjection(pageText: string): boolean {
  return /ignore (all |previous )?instructions/i.test(pageText)
    || /reveal (the )?(api|secret|credential|password)/i.test(pageText)
    || /navigate to (https?:\/\/)?(?!portal\.(venue|supplier)\.example)/i.test(pageText)
    || /exfiltrate/i.test(pageText);
}

export type SimulatedBrowserResult = {
  run: AtelierBrowserRun;
  actions: AtelierBrowserAction[];
  blocked: boolean;
  blockReason?: string;
  downloadQuarantineRef?: string;
};

export function simulateBrowserRun(input: {
  organisationId: string;
  eventId: string;
  runId: string;
  stepId: string;
  allowedDomains: readonly string[];
  startUrl: string;
  pageText?: string;
  consequential: boolean;
  confirmationId?: string;
  redirectTo?: string;
  now: string;
}): SimulatedBrowserResult {
  const actions: AtelierBrowserAction[] = [];
  const run: AtelierBrowserRun = {
    id: randomUUID(),
    runId: input.runId,
    stepId: input.stepId,
    organisationId: input.organisationId,
    eventId: input.eventId,
    executorPolicyVersion: BROWSER_EXECUTOR_POLICY_VERSION,
    allowedDomains: [...input.allowedDomains],
    credentialBindingRef: `cred:sim:${createHash("sha256").update(input.organisationId).digest("hex").slice(0, 12)}`,
    containerRef: `container:sim:${randomUUID()}`,
    status: "RUNNING",
    startedAt: input.now,
    simulation: true,
  };

  try {
    assertDomainAllowed(input.startUrl, input.allowedDomains);
  } catch (error) {
    run.status = "BLOCKED";
    run.endedAt = input.now;
    run.terminationReason = error instanceof Error ? error.message : "blocked";
    return { run, actions, blocked: true, blockReason: run.terminationReason };
  }

  if (input.redirectTo) {
    try {
      assertDomainAllowed(input.redirectTo, input.allowedDomains);
    } catch (error) {
      actions.push({
        id: randomUUID(),
        browserRunId: run.id,
        organisationId: input.organisationId,
        eventId: input.eventId,
        ordinal: 1,
        batchId: randomUUID(),
        actionType: "NAVIGATE",
        targetDescriptor: "redirect",
        url: input.redirectTo,
        result: "BLOCKED_REDIRECT",
        promptInjectionSignal: false,
        createdAt: input.now,
      });
      run.status = "BLOCKED";
      run.endedAt = input.now;
      run.terminationReason = error instanceof Error ? error.message : "redirect blocked";
      return { run, actions, blocked: true, blockReason: run.terminationReason };
    }
  }

  const pageText = input.pageText ?? "Approved portal document index";
  const injection = detectBrowserPromptInjection(pageText);
  if (injection) {
    actions.push({
      id: randomUUID(),
      browserRunId: run.id,
      organisationId: input.organisationId,
      eventId: input.eventId,
      ordinal: 1,
      batchId: randomUUID(),
      actionType: "OBSERVE",
      targetDescriptor: "page-text",
      url: input.startUrl,
      result: "PROMPT_INJECTION_PAUSED",
      promptInjectionSignal: true,
      createdAt: input.now,
    });
    run.status = "PAUSED";
    run.terminationReason = "Suspected prompt injection in page content";
    return { run, actions, blocked: true, blockReason: run.terminationReason };
  }

  if (input.consequential && !input.confirmationId) {
    run.status = "PAUSED";
    run.terminationReason = "Immediate human confirmation required before consequential browser effect";
    return { run, actions, blocked: true, blockReason: run.terminationReason };
  }

  const downloadRef = `quarantine:${createHash("sha256").update(`${input.runId}:${input.startUrl}`).digest("hex").slice(0, 16)}`;
  actions.push({
    id: randomUUID(),
    browserRunId: run.id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    ordinal: 1,
    batchId: randomUUID(),
    actionType: "RETRIEVE",
    targetDescriptor: "document",
    url: input.startUrl,
    result: "RETRIEVED_QUARANTINED",
    screenshotRef: `screenshot:sim:${randomUUID()}`,
    confirmationId: input.confirmationId,
    promptInjectionSignal: false,
    createdAt: input.now,
  });
  run.status = "COMPLETED";
  run.endedAt = input.now;
  run.terminationReason = "Simulation completed; browser profile destroyed";
  // Profile destruction is recorded by moving to DESTROYED after evidence capture.
  const destroyed = { ...run, status: "DESTROYED" as const };
  return { run: destroyed, actions, blocked: false, downloadQuarantineRef: downloadRef };
}
