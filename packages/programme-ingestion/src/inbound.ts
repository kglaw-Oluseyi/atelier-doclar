import { COMMIT_SHA_PATTERN } from "@maison-doclar/programme-domain";
import { z } from "zod";
import { IngestionError } from "./errors.js";

const RepositoryIdentitySchema = z
  .object({
    full_name: z.string().min(1),
  })
  .passthrough();

const PushCommitSchema = z
  .object({
    id: z.string().regex(COMMIT_SHA_PATTERN),
    message: z.string(),
    timestamp: z.string().min(1),
    author: z
      .object({
        name: z.string().optional(),
        username: z.string().optional(),
      })
      .passthrough()
      .optional(),
    committer: z
      .object({
        name: z.string().optional(),
        username: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const PushPayloadSchema = z
  .object({
    ref: z.string().min(1),
    repository: RepositoryIdentitySchema,
    commits: z.array(PushCommitSchema),
  })
  .passthrough();

export const WorkflowRunPayloadSchema = z
  .object({
    action: z.string().optional(),
    repository: RepositoryIdentitySchema,
    workflow_run: z
      .object({
        id: z.union([z.number().int(), z.string().min(1)]),
        name: z.string().min(1),
        head_sha: z.string().regex(COMMIT_SHA_PATTERN),
        head_branch: z.string().min(1),
        status: z.string().min(1),
        conclusion: z.string().nullable(),
        html_url: z.string().min(1),
        updated_at: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

export const PingPayloadSchema = z
  .object({
    zen: z.string().optional(),
    repository: RepositoryIdentitySchema,
  })
  .passthrough();

export type PushPayload = z.infer<typeof PushPayloadSchema>;
export type WorkflowRunPayload = z.infer<typeof WorkflowRunPayloadSchema>;
export type PingPayload = z.infer<typeof PingPayloadSchema>;

export function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new IngestionError("MALFORMED_PAYLOAD", "webhook body is not valid JSON", "body");
  }
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new IngestionError(
      "MALFORMED_PAYLOAD",
      `${label} failed schema validation`,
      issue?.path.join(".") || label,
      issue?.message,
    );
  }
  return parsed.data;
}

export function parsePushPayload(value: unknown): PushPayload {
  return parseOrThrow(PushPayloadSchema, value, "push payload");
}

export function parseWorkflowRunPayload(value: unknown): WorkflowRunPayload {
  return parseOrThrow(WorkflowRunPayloadSchema, value, "workflow_run payload");
}

export function parsePingPayload(value: unknown): PingPayload {
  return parseOrThrow(PingPayloadSchema, value, "ping payload");
}

export function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const match = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  if (!match) return undefined;
  const value = headers[match];
  return Array.isArray(value) ? value[0] : value;
}
