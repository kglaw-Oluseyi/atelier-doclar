import { test } from "@playwright/test";
import { runCheckpointP2 } from "./s075-checkpoint";

test.use({ screenshot: "off", video: "off", trace: "on-first-retry" });

test("S075 checkpoint P2: layout publish", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await runCheckpointP2(page, browser);
});
