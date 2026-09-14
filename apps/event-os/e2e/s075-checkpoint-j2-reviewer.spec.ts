import { expect, test } from "@playwright/test";
import { runCheckpointJ2Reviewer } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 checkpoint J2-reviewer: specialist review and denials", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ2Reviewer(page, browser);
  expect(manifest.phasesCompleted).toContain("j2-reviewer");
});
