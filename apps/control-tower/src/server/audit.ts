import { join } from "node:path";
import { FileAuditRepository, type AuditRepository } from "@maison-doclar/programme-tower";

let repository: AuditRepository | undefined;

export function auditRepository(): AuditRepository {
  if (!repository) {
    const dir = process.env.PROGRAMME_DATA_DIR ?? join(process.cwd(), "data");
    repository = new FileAuditRepository(join(dir, "audit.jsonl"));
  }
  return repository;
}
