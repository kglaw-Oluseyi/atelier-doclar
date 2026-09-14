import { expect, test } from "@playwright/test";
import { runCheckpointJ2Prep } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 checkpoint J2-prep: SECURITY rule, freeze, submit", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ2Prep(page, browser);
  expect(manifest.phasesCompleted).toContain("j2-prep");
  expect(manifest.j2SubmittedHash).toMatch(/^[a-f0-9]{64}$/i);
});
