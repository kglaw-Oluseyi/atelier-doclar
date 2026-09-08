import type { LayoutAssuranceWorkspace, LayoutSetupWorkspace } from "@maison-doclar/shared-platform";

export type ActionReadiness = {
  ready: boolean;
  reason: string;
};

export function layoutSubmitReadiness(workspace: LayoutSetupWorkspace): ActionReadiness {
  const { assurance, layout } = workspace;
  const currentRun = assurance.latestRun && assurance.latestRun.contentHash === layout.contentHash;
  if (!currentRun) {
    return {
      ready: false,
      reason: "Run validation on the current revision before submitting for approval.",
    };
  }
  if (assurance.unresolvedBlockingCount > 0) {
    return {
      ready: false,
      reason: "Resolve or obtain an authorised override for every blocking finding before submission.",
    };
  }
  return { ready: true, reason: "Current hash is validated and has no unresolved blocking findings." };
}

export function layoutApproveReadiness(
  workspace: LayoutSetupWorkspace,
  approval: LayoutAssuranceWorkspace["approvals"][number],
): ActionReadiness {
  if (approval.status !== "SUBMITTED") {
    return { ready: false, reason: "Only a submitted hash can be decided." };
  }
  if (approval.contentHash !== workspace.layout.contentHash) {
    return { ready: false, reason: "The submitted hash is no longer current. Reload before deciding." };
  }
  return { ready: true, reason: "A submitted hash is waiting for a different authorised checker." };
}

export function layoutPublishReadiness(workspace: LayoutSetupWorkspace): ActionReadiness {
  const { assurance, layout } = workspace;
  const approved = assurance.approvals.some(
    (item) => item.status === "APPROVED" && item.contentHash === layout.contentHash,
  );
  if (!approved) {
    return {
      ready: false,
      reason: "Publish is refused until this exact content hash is approved. Drafts are not published.",
    };
  }
  if (assurance.publicationBlocked) {
    return {
      ready: false,
      reason: "Unresolved blocking findings prevent publication of this hash.",
    };
  }
  return { ready: true, reason: "An approval is bound to the current hash." };
}
