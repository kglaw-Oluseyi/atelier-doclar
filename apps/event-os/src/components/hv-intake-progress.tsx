import type { GuestIntakeJob } from "@maison-doclar/shared-platform";
import { validationCounterDisplay } from "../server/hv-intake-validation-counters";

export function HvIntakeProgress({ job }: { job: GuestIntakeJob }) {
  const p = job.progress;
  const total = Math.max(p.rowsTotal, 1);
  const settled = p.rowsPromoted + p.rowsUpdated + p.rowsUnchanged + p.rowsSkipped + p.rowsFailed;
  const pct = Math.min(100, Math.round((settled / total) * 100));
  const validation = validationCounterDisplay(p, job.status);
  return (
    <section className="atelier-progress" aria-labelledby="hv-intake-progress-title">
      <h2 id="hv-intake-progress-title">Progress</h2>
      <p role="status" aria-live="polite">
        Phase <strong>{p.phase}</strong>
        {p.elapsedMs !== undefined ? ` · ${Math.round(p.elapsedMs / 1000)}s elapsed` : null}
        {" · "}
        last update {new Date(p.lastProgressAt).toLocaleString()}
      </p>
      <div
        className="atelier-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.status === "PROMOTING" || job.status === "COMPLETED" || job.status === "COMPLETED_WITH_EXCEPTIONS" ? pct : undefined}
        aria-label="Intake promotion progress"
      >
        <div style={{ width: `${pct}%`, height: "0.5rem", background: "var(--at-brass, #8B6E38)" }} />
      </div>
      <ul className="atelier-progress-counts">
        <li>Total {p.rowsTotal}</li>
        {validation.mode === "counts" ? (
          <>
            <li>Valid {validation.valid}</li>
            <li>Warnings {validation.warnings}</li>
            <li>Invalid {validation.invalid}</li>
          </>
        ) : (
          <li data-testid="hv-validation-counters-unavailable">{validation.reason}</li>
        )}
        <li>Duplicates {p.rowsDuplicate}</li>
        <li>Conflicts {p.rowsConflict}</li>
        <li>Promoted {p.rowsPromoted}</li>
        <li>Updated {p.rowsUpdated}</li>
        <li>Unchanged {p.rowsUnchanged}</li>
        <li>Chunks {p.chunksCommitted}</li>
      </ul>
      {["PROMOTING", "VALIDATING", "PARSING"].includes(job.status) ? (
        <p className="lede">Safe to leave this page — work resumes from the last checkpoint.</p>
      ) : null}
    </section>
  );
}
