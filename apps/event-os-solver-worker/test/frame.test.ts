import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFrame, FrameDecoder } from "../src/frame.js";

test("frame encode/decode round-trip", () => {
  const payload = { a: 1, b: [2, 3], c: { d: "e" } };
  const frame = encodeFrame(payload);
  assert.equal(frame.readUInt32BE(0), frame.length - 4);
  const dec = new FrameDecoder();
  const msgs = dec.push(frame);
  assert.deepEqual(msgs, [payload]);
});

test("frame decoder handles split chunks", () => {
  const payload = { runId: "x", n: 42 };
  const frame = encodeFrame(payload);
  const dec = new FrameDecoder();
  assert.deepEqual(dec.push(frame.subarray(0, 2)), []);
  assert.deepEqual(dec.push(frame.subarray(2, 6)), []);
  assert.deepEqual(dec.push(frame.subarray(6)), [payload]);
});

test("oversized frame rejected", () => {
  assert.throws(() => {
    const huge = "x".repeat(9 * 1024 * 1024);
    encodeFrame({ huge });
  });
});
