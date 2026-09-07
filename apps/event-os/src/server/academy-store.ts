import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Pool } from "pg";
import {
  ACADEMY_CATALOGUE,
  AcademyLearnerRecordSchema,
  type AcademyAttemptRecord,
  type AcademyLearnerRecord,
} from "@maison-doclar/academy";
import { databaseUrl } from "./config";

const TABLE = `
CREATE TABLE IF NOT EXISTS event_os_academy_delta (
  record_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (person_id, course_id)
);
`;

const CATALOGUE_TABLE = `
CREATE TABLE IF NOT EXISTS event_os_academy_catalogue (
  course_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL
);
`;

const CATALOGUE_SEED = `
INSERT INTO event_os_academy_catalogue (course_id, slug, version, title, registered_at)
VALUES ${ACADEMY_CATALOGUE.map((_, index) => `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, NOW())`).join(", ")}
ON CONFLICT (course_id) DO UPDATE
SET slug = EXCLUDED.slug, version = EXCLUDED.version, title = EXCLUDED.title;
`;

function filePath(): string {
  return join(process.cwd(), "data", "academy-s04a.json");
}

function emptyBook(): Record<string, AcademyLearnerRecord> {
  return {};
}

function keyOf(personId: string, courseId: string): string {
  return `${personId}:${courseId}`;
}

function readFileBook(): Record<string, AcademyLearnerRecord> {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyBook();
    const book: Record<string, AcademyLearnerRecord> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const record = AcademyLearnerRecordSchema.safeParse(value);
      if (record.success) book[key] = record.data;
    }
    return book;
  } catch {
    return emptyBook();
  }
}

function writeFileBook(book: Record<string, AcademyLearnerRecord>): void {
  mkdirSync(dirname(filePath()), { recursive: true });
  writeFileSync(filePath(), JSON.stringify(book, null, 2));
}

let pool: Pool | undefined;

function postgresPool(): Pool | undefined {
  const url = databaseUrl();
  if (!url) return undefined;
  pool ??= new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 8_000 });
  return pool;
}

export async function ensureAcademyStore(): Promise<void> {
  const client = postgresPool();
  if (!client) return;
  await client.query(TABLE);
  await client.query(CATALOGUE_TABLE);
  await client.query(
    CATALOGUE_SEED,
    ACADEMY_CATALOGUE.flatMap((item) => [item.id, item.slug, item.version, item.title]),
  );
}

export async function loadAcademyRecord(personId: string, courseId: string): Promise<AcademyLearnerRecord | undefined> {
  const client = postgresPool();
  if (client) {
    await ensureAcademyStore();
    const result = await client.query<{ payload: unknown }>(
      "SELECT payload FROM event_os_academy_delta WHERE person_id = $1 AND course_id = $2",
      [personId, courseId],
    );
    const payload = result.rows[0]?.payload;
    const parsed = AcademyLearnerRecordSchema.safeParse(payload);
    return parsed.success ? parsed.data : undefined;
  }
  return readFileBook()[keyOf(personId, courseId)];
}

export async function saveAcademyRecord(record: AcademyLearnerRecord): Promise<AcademyLearnerRecord> {
  const parsed = AcademyLearnerRecordSchema.parse(record);
  const client = postgresPool();
  if (client) {
    await ensureAcademyStore();
    await client.query(
      `INSERT INTO event_os_academy_delta (record_id, person_id, course_id, payload, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (person_id, course_id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [keyOf(parsed.personId, parsed.courseId), parsed.personId, parsed.courseId, JSON.stringify(parsed), parsed.updatedAt],
    );
    return parsed;
  }
  const book = readFileBook();
  book[keyOf(parsed.personId, parsed.courseId)] = parsed;
  writeFileBook(book);
  return parsed;
}

export function appendAttempt(record: AcademyLearnerRecord | undefined, attempt: AcademyAttemptRecord): AcademyLearnerRecord {
  const prior = record?.attempts ?? [];
  const replay = prior.find((item) => item.idempotencyKey && item.idempotencyKey === attempt.idempotencyKey);
  const attempts = replay ? prior : [...prior, attempt];
  return AcademyLearnerRecordSchema.parse({
    personId: attempt.personId,
    courseId: attempt.courseId,
    learningPath: attempt.learningPath,
    attempts,
    latestOutcome: (replay ?? attempt).result.outcome,
    updatedAt: attempt.submittedAt,
  });
}
