import { chromium } from "@playwright/test";
import { loginAs } from "../e2e/login";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app";
  const CAP600 = "053fa686-124e-49b3-b8a8-d0497c0a1668";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await loginAs(page, "ceo");
  const timings: Record<string, number> = {};
  let t = Date.now();
  await page.goto(`/app/events/${CAP600}/seating`, { waitUntil: "domcontentloaded" });
  timings.overviewMs = Date.now() - t;
  const overview = ((await page.getByTestId("seating-overview").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
  t = Date.now();
  await page.goto(`/app/events/${CAP600}/seating#runs`, { waitUntil: "domcontentloaded" });
  timings.runsMs = Date.now() - t;
  const runCards = await page.getByTestId("seating-run-card").count().catch(() => 0);
  t = Date.now();
  await page.goto(`/app/events/${CAP600}/seating#review`, { waitUntil: "domcontentloaded" });
  timings.reviewMs = Date.now() - t;
  const adoptAsCeo = await page.getByTestId("cpsat-adopt-candidate").count();
  await page.setViewportSize({ width: 390, height: 844 });
  t = Date.now();
  await page.goto(`/app/events/${CAP600}/seating`, { waitUntil: "domcontentloaded" });
  timings.mobileOverviewMs = Date.now() - t;
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  const auditor = await loginAs(page, "auditor");
  void auditor;
  await page.goto(`/app/events/${CAP600}/seating#review`, { waitUntil: "domcontentloaded" });
  const adoptAsAuditor = await page.getByTestId("cpsat-adopt-candidate").count();
  const out = {
    eventId: CAP600,
    scale: "CAP600",
    timings,
    overviewSnippet: overview.slice(0, 280),
    runCards,
    adoptControlVisibleToCeo: adoptAsCeo > 0,
    adoptControlVisibleToAuditor: adoptAsAuditor > 0,
    mobileOverflow,
    notes: "Automated supplement; CAP1000 UI not installed (layout OOM). Human Claude still required.",
    at: new Date().toISOString(),
    base: BASE,
  };
  const dir = join(process.cwd(), "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "LARGE_EVENT_FRONTEND.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
