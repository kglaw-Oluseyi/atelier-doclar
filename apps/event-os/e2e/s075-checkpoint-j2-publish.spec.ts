import { expect, test } from "@playwright/test";
import { runCheckpointJ2Publish } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "off" });

test("S075 checkpoint J2-publish: approve and CEO publish LKG", async ({ page, browser }) => {
  test.setTimeout(600_000);
  const manifest = await runCheckpointJ2Publish(page, browser);
  expect(manifest.phasesCompleted).toContain("j2-publish");
  expect(manifest.j2PublicationBadge).toMatch(/Publication 1/);
  expect(manifest.j2LkgDraftHash).toBeTruthy();
});
