"use client";

import { useState } from "react";

export function CopyableIdentifier({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) {
    return (
      <div className="protection-identifier-block">
        <dt>{label}</dt>
        <dd data-testid={testId}>Not recorded</dd>
      </div>
    );
  }
  return (
    <div className="protection-identifier-block">
      <dt>{label}</dt>
      <dd>
        <code className="protection-identifier" data-testid={testId}>
          {value}
        </code>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </dd>
    </div>
  );
}

export function ProtectionReleaseEvidence({
  deployedSha,
  persistence,
  migrationStatus,
  productionAuthorised,
  s05aStatus,
  s05aEdition,
  evaluation,
}: {
  deployedSha: string;
  persistence: string;
  migrationStatus?: string;
  productionAuthorised: boolean;
  s05aStatus?: string;
  s05aEdition?: string;
  evaluation: {
    evaluationStatus: string;
    evaluationBlocked: boolean;
    releaseReady: boolean;
    blockingReasons: string[];
    corpusEdition: string;
    corpusHash: string;
    caseCount: number;
    persistedResultCount: number;
    passedCount: number;
    failedCount: number;
    errorCount?: number;
    zeroToleranceFailed: boolean;
    lastRunId?: string;
    startedAt?: string;
    completedAt?: string;
    fixtureIdentity?: string;
    providerVersion?: string;
    orchestratorVersion?: string;
    adapters?: Record<string, string>;
    productionAuthorised?: boolean;
  };
}) {
  const adapters = evaluation.adapters ?? {};
  return (
    <section className="atelier-panel protection-release-evidence" data-testid="protection-release-evidence">
      <h3>Release evidence</h3>
      <p>
        Fixture assurance is not production authorisation. A current complete pass only means the synthetic corpus is ready; live operations remain unauthorised.
      </p>
      <dl className="protection-release-list">
        <CopyableIdentifier label="Deployed application SHA" value={deployedSha} testId="release-deployed-sha" />
        <div>
          <dt>Persistence</dt>
          <dd data-testid="release-persistence">{persistence}</dd>
        </div>
        <div>
          <dt>Migration status</dt>
          <dd data-testid="release-migration">{migrationStatus ?? "unknown"}</dd>
        </div>
        <div>
          <dt>Production authorised</dt>
          <dd data-testid="release-production-authorised">{String(productionAuthorised)}</dd>
        </div>
        <div>
          <dt>S05A evaluation</dt>
          <dd data-testid="release-s05a">
            {s05aStatus ?? "unavailable"} {s05aEdition ? `· ${s05aEdition}` : ""}
          </dd>
        </div>
        <div>
          <dt>S05B evaluation edition</dt>
          <dd data-testid="release-s05b-edition">{evaluation.corpusEdition}</dd>
        </div>
        <CopyableIdentifier label="S05B corpus hash" value={evaluation.corpusHash} testId="release-s05b-hash" />
        <div>
          <dt>S05B counts</dt>
          <dd data-testid="release-s05b-counts">
            total {evaluation.caseCount} · passed {evaluation.passedCount} · failed {evaluation.failedCount} · persisted {evaluation.persistedResultCount}
          </dd>
        </div>
        <div>
          <dt>Zero-tolerance</dt>
          <dd data-testid="release-s05b-zero-tolerance">{evaluation.zeroToleranceFailed ? "failed" : "clear"}</dd>
        </div>
        <CopyableIdentifier label="Run ID" value={evaluation.lastRunId ?? ""} testId="release-s05b-run-id" />
        <div>
          <dt>Provider / fixture identity</dt>
          <dd data-testid="release-s05b-fixture">{evaluation.fixtureIdentity ?? evaluation.providerVersion ?? "unrun"}</dd>
        </div>
        <div>
          <dt>Run times</dt>
          <dd data-testid="release-s05b-times">
            started {evaluation.startedAt ?? "unrun"} · completed {evaluation.completedAt ?? "not completed"}
          </dd>
        </div>
        <div>
          <dt>Evaluation status</dt>
          <dd data-testid="release-s05b-status">{evaluation.evaluationStatus}</dd>
        </div>
        <div>
          <dt>s05bEvaluationBlocked</dt>
          <dd data-testid="release-s05b-blocked">{String(evaluation.evaluationBlocked)}</dd>
        </div>
        <div>
          <dt>s05bReleaseReady</dt>
          <dd data-testid="release-s05b-ready">{String(evaluation.releaseReady)}</dd>
        </div>
        <div>
          <dt>Blocking reasons</dt>
          <dd data-testid="release-s05b-blocking">{evaluation.blockingReasons.join("; ") || "none"}</dd>
        </div>
        <div>
          <dt>S05B adapters</dt>
          <dd data-testid="release-s05b-adapters">
            object store {adapters.OBJECT_STORE ?? "UNKNOWN"} · scan {adapters.SCAN ?? "UNKNOWN"} · OCR {adapters.OCR ?? "UNKNOWN"} · source monitor {adapters.SOURCE_MONITOR ?? "UNKNOWN"} · communications {adapters.COMMUNICATIONS ?? "UNKNOWN"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
