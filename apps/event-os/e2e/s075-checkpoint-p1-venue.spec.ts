import { test } from "@playwright/test";
import { runCheckpointP1Venue } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test("S075 checkpoint P1-venue: adopt venue", async ({ page }) => {
  test.setTimeout(180_000);
  await runCheckpointP1Venue(page);
});
