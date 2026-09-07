import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { login } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const EBUN = "00000000-0000-4000-8000-000000000072";
const PROGRAMME = `/app/events/${ALPHA}/programme`;
const DOSSIER = `/app/events/${ALPHA}/guests/${EBUN}`;
const EVIDENCE = "test-results/eos-s04b-responsive";

const VIEWPORTS = {
  mobile: { width: 360, height: 800 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  zoomLayout: { width: 720, height: 450 },
} as const;

type LayoutMeasurement = {
  label: string;
  viewportWidth: number;
  viewportHeight: number;
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  overflowX: number;
  visualViewportWidth: number;
  visualViewportHeight: number;
  visualViewportScale: number;
  cssZoom: string;
};

function evidencePath(name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  return `${EVIDENCE}/${name}`;
}

async function openViewportContext(
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);
  return { context, page };
}

async function applyCssZoom(page: Page, zoom?: string) {
  if (!zoom) return;
  await page.evaluate((value) => {
    document.documentElement.style.zoom = value;
  }, zoom);
}

async function measureLayout(page: Page, label: string): Promise<LayoutMeasurement> {
  const measured = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      clientWidth: root.clientWidth,
      clientHeight: root.clientHeight,
      scrollWidth,
      scrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      overflowX: scrollWidth - root.clientWidth,
      visualViewportWidth: window.visualViewport?.width ?? window.innerWidth,
      visualViewportHeight: window.visualViewport?.height ?? window.innerHeight,
      visualViewportScale: window.visualViewport?.scale ?? 1,
      cssZoom: root.style.zoom || getComputedStyle(root).zoom,
    };
  });
  return { label, ...measured };
}

async function assertNoDocumentOverflow(page: Page, allowance = 1) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  });
  expect(overflow, `document overflowX ${overflow}px`).toBeLessThanOrEqual(allowance);
}

async function assertReachable(page: Page, locator: ReturnType<Page["getByRole"]> | ReturnType<Page["locator"]>) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, "control bounding box").toBeTruthy();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
}

async function assertVisibleFocus(page: Page) {
  const focus = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  });
  expect(focus).toBeTruthy();
  const width = Number.parseFloat(focus!.outlineWidth);
  const hasOutline = focus!.outlineStyle !== "none" && width >= 2;
  const hasRing = /rgb\(139,\s*110,\s*56\)/.test(focus!.boxShadow) || /rgb\(139,\s*110,\s*56\)/.test(focus!.outlineColor);
  expect(hasOutline || hasRing, JSON.stringify(focus)).toBeTruthy();
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: evidencePath(name), fullPage: true });
}

async function exerciseProgrammeSurfaces(page: Page, slug: string, overflowAllowance = 1, cssZoom?: string) {
  await page.goto(PROGRAMME);
  await applyCssZoom(page, cssZoom);
  await expect(page.getByRole("heading", { name: /Programme, routing and perimeter/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Programme", exact: true })).toBeVisible();
  await expect(page.getByText("Whole-event attendance is the distinct-person union")).toBeVisible();
  await assertReachable(page, page.getByRole("navigation", { name: "Programme sections" }).getByRole("link", { name: "Overview" }));
  await assertReachable(page, page.getByRole("button", { name: "Add ceremony" }));
  await shot(page, `${slug}-01-overview.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.getByRole("navigation", { name: "Programme sections" }).getByRole("link", { name: "Phases" }).click();
  await expect(page.getByRole("heading", { name: "Phase participation" })).toBeVisible();
  const yorubaName = page.locator(".guest-name").filter({ hasText: /Ẹ̀bùnolúwa|Ẹbùnọláúwa|Alákíjà/ }).first();
  await expect(yorubaName).toBeVisible();
  expect(await yorubaName.evaluate((node) => getComputedStyle(node).wordBreak)).not.toBe("break-all");
  await shot(page, `${slug}-02-phase-participation.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.getByRole("navigation", { name: "Programme sections" }).getByRole("link", { name: "Perimeter" }).click();
  await expect(page.getByRole("heading", { name: "Arrival routes and checkpoints" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Ordered perimeter checkpoints" })).toBeVisible();
  await expect(page.locator(".programme-perimeter-legend")).toContainText("Estate main gate");
  const svgBox = await page.locator("svg.programme-perimeter").boundingBox();
  expect(svgBox?.width).toBeGreaterThan(0);
  expect(svgBox?.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 1440) + overflowAllowance);
  await shot(page, `${slug}-03-arrival-perimeter.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.getByRole("button", { name: "Resolve credential" }).click();
  await applyCssZoom(page, cssZoom);
  await expect(page.getByTestId("resolve-outcome")).toContainText("AUTHORISED");
  await expect(page.getByText("Attendance was not written.")).toBeVisible();
  await shot(page, `${slug}-04-credential-resolution.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(`${PROGRAMME}?state=VERSION_CONFLICT`);
  await applyCssZoom(page, cssZoom);
  const conflict = page.locator(".atelier-state[data-kind='conflict']").first();
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("The record changed elsewhere");
  await expect(conflict).toContainText("Your attempted edit was not saved");
  await shot(page, `${slug}-05-conflict.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(`${PROGRAMME}?error=The+submitted+information+is+not+valid.`);
  await applyCssZoom(page, cssZoom);
  const error = page.locator(".atelier-state[data-kind='validation']").first();
  await expect(error).toBeVisible();
  await expect(error).toContainText("The submitted information is not valid");
  await shot(page, `${slug}-06-validation.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(DOSSIER);
  await applyCssZoom(page, cssZoom);
  await expect(page.getByRole("heading", { name: "Phase eligibility and arrival" })).toBeVisible();
  await expect(page.getByText("Church")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ẹbùnọláúwa|Ẹ̀bùnolúwa/ })).toBeVisible();
  await assertReachable(page, page.getByRole("navigation", { name: "Dossier sections" }).getByRole("link").first());
  await shot(page, `${slug}-07-phase-eligibility.png`);
  await assertNoDocumentOverflow(page, overflowAllowance);

  await page.goto(PROGRAMME);
  await applyCssZoom(page, cssZoom);
  await page.getByRole("button", { name: "Resolve credential" }).focus();
  await expect(page.getByRole("button", { name: "Resolve credential" })).toBeFocused();
  await assertVisibleFocus(page);
  await shot(page, `${slug}-08-focus.png`);
}

test.describe.configure({ timeout: 180_000 });

test("EOS-S04B 360px mobile responsive accessibility", async ({ browser }) => {
  const { context, page } = await openViewportContext(browser, VIEWPORTS.mobile);
  const viewport = page.viewportSize();
  expect(viewport).toEqual(VIEWPORTS.mobile);
  await exerciseProgrammeSurfaces(page, "360");
  const layout = await measureLayout(page, "360px mobile");
  writeFileSync(evidencePath("360-metrics.json"), JSON.stringify(layout, null, 2));
  expect(layout.viewportWidth).toBe(360);
  expect(layout.overflowX).toBeLessThanOrEqual(1);
  await context.close();
});

test("EOS-S04B 768px tablet responsive accessibility", async ({ browser }) => {
  const { context, page } = await openViewportContext(browser, VIEWPORTS.tablet);
  expect(page.viewportSize()).toEqual(VIEWPORTS.tablet);
  await exerciseProgrammeSurfaces(page, "768");
  const layout = await measureLayout(page, "768px tablet");
  writeFileSync(evidencePath("768-metrics.json"), JSON.stringify(layout, null, 2));
  expect(layout.viewportWidth).toBe(768);
  expect(layout.overflowX).toBeLessThanOrEqual(1);
  await context.close();
});

test("EOS-S04B 1440px desktop responsive accessibility", async ({ browser }) => {
  const { context, page } = await openViewportContext(browser, VIEWPORTS.desktop);
  expect(page.viewportSize()).toEqual(VIEWPORTS.desktop);
  await exerciseProgrammeSurfaces(page, "1440");
  const layout = await measureLayout(page, "1440px desktop");
  writeFileSync(evidencePath("1440-metrics.json"), JSON.stringify(layout, null, 2));
  expect(layout.viewportWidth).toBe(1440);
  expect(layout.overflowX).toBeLessThanOrEqual(1);
  await context.close();
});

test("EOS-S04B 1440px at 200% zoom and 720px layout equivalent", async ({ browser }) => {
  const zoomContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const zoomPage = await zoomContext.newPage();
  await login(zoomPage);
  expect(zoomPage.viewportSize()).toEqual(VIEWPORTS.desktop);
  await exerciseProgrammeSurfaces(zoomPage, "1440-zoom2", 8, "2");
  const zoomLayout = await measureLayout(zoomPage, "1440px CSS zoom 2");
  writeFileSync(evidencePath("1440-zoom2-metrics.json"), JSON.stringify(zoomLayout, null, 2));
  expect(zoomLayout.viewportWidth).toBe(1440);
  expect(zoomLayout.overflowX).toBeLessThanOrEqual(8);
  await zoomContext.close();

  const { context, page } = await openViewportContext(browser, VIEWPORTS.zoomLayout);
  expect(page.viewportSize()).toEqual(VIEWPORTS.zoomLayout);
  await exerciseProgrammeSurfaces(page, "720-as-1440-200pct");
  const layout = await measureLayout(page, "720px layout equivalent of 1440 at 200%");
  writeFileSync(evidencePath("720-as-1440-200pct-metrics.json"), JSON.stringify(layout, null, 2));
  expect(layout.viewportWidth).toBe(720);
  expect(layout.overflowX).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading", { name: /Programme, routing and perimeter/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add ceremony" })).toBeVisible();
  await context.close();
});
