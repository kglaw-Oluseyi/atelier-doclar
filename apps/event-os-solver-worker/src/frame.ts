/**
 * Length-prefixed framed JSON (4-byte big-endian length + UTF-8 JSON).
 * Shared framing helpers for supervisor ↔ child fd protocol.
 */
import { createHash } from "node:crypto";

export const FRAME_MAX_BYTES = 8 * 1024 * 1024;

export function encodeFrame(payload: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  if (body.length > FRAME_MAX_BYTES) {
    throw new Error(`frame exceeds FRAME_MAX_BYTES (${body.length})`);
  }
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

export class FrameDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): unknown[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const out: unknown[] = [];
    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (len > FRAME_MAX_BYTES) {
        throw new Error(`frame length ${len} exceeds FRAME_MAX_BYTES`);
      }
      if (this.buffer.length < 4 + len) break;
      const body = this.buffer.subarray(4, 4 + len);
      this.buffer = this.buffer.subarray(4 + len);
      out.push(JSON.parse(body.toString("utf8")));
    }
    return out;
  }
}

export function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
