import { test } from "@playwright/test";
import { runCheckpointP3 } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test("S075 checkpoint P3: seating binding and baseline", async ({ page, browser }) => {
  test.setTimeout(450_000);
  await runCheckpointP3(page, browser);
});
