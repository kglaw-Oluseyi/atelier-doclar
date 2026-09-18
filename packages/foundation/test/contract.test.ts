import { describe, expect, it } from "vitest";
import { verifySliceContract } from "../../../scripts/verify-slice-contract";

describe("slice contract", () => {
  it("matches the registered template and covers every capability field", () => {
    expect(verifySliceContract()).toEqual([]);
  });
});
