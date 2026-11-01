import { test as base, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { observeBrowser } from "./diagnostics";

const test = base.extend<{ browserLog: ReturnType<typeof observeBrowser> }>({
  browserLog: [
    async ({ page }, use, testInfo) => {
      const log = observeBrowser(page);
      await use(log);
      await testInfo.attach("browser-diagnostics", {
        body: JSON.stringify(log.diagnostics, null, 2),
        contentType: "application/json",
      });
      log.assertClean();
    },
    { auto: true },
  ],
});

const toggle = (page: Page) =>
  page.getByRole("button", { name: "Dark mode", exact: true });
async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(toggle(page)).toHaveAttribute(
    "aria-pressed",
    String(theme === "dark"),
  );
  await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
}

test("first visit follows the OS live until a persisted choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expectTheme(page, "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(244, 246, 250)",
  );
  await expect(page.locator(".empty-paper")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  const toggleBounds = await toggle(page).boundingBox();
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "dark");
  expect(await toggle(page).boundingBox()).toEqual(toggleBounds);
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
  await toggle(page).focus();
  await toggle(page).press("Space");
  await expectTheme(page, "dark");
  expect(
    await page.evaluate(() => localStorage.getItem("margin.theme.v1")),
  ).toBe("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "dark");
  await page.reload();
  await expectTheme(page, "dark");
  await toggle(page).click();
  await expectTheme(page, "light");
  await page.reload();
  await expectTheme(page, "light");
});

test("invalid saved values fall back to the live system preference", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("margin.theme.v1", "sepia"),
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expectTheme(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "light");
});

test("blocked storage still allows an explicit choice in memory", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expectTheme(page, "dark");
  await toggle(page).click();
  await expectTheme(page, "light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "light");
  await toggle(page).click();
  await expectTheme(page, "dark");
});

test("cross-tab changes, removal, and clear resync the system preference", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expectTheme(page, "light");
  const other = await context.newPage();
  const otherLog = observeBrowser(other);
  try {
    await other.goto("/");
    await expectTheme(other, "light");
    await toggle(other).click();
    await expectTheme(page, "dark");
    await other.evaluate(() => localStorage.removeItem("margin.theme.v1"));
    await expectTheme(page, "light");
    await other.evaluate(() => localStorage.setItem("margin.theme.v1", "dark"));
    await expectTheme(page, "dark");
    await other.evaluate(() => localStorage.clear());
    await expectTheme(page, "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expectTheme(page, "dark");
    otherLog.assertClean();
  } finally {
    await other.close();
  }
});

for (const saved of [null, "dark", "invalid"]) {
  test(`bootstrap paints dark with hydration paused and preference ${saved}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      colorScheme: saved === "dark" ? "light" : "dark",
    });
    if (saved !== null)
      await page.addInitScript(
        (value) => localStorage.setItem("margin.theme.v1", value),
        saved,
      );
    let release: () => void = () => {};
    const hydration = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/_next/**/*.js", async (route) => {
      await hydration;
      await route.continue();
    });
    try {
      await page.goto("/", { waitUntil: "commit" });
      await expect(
        page.getByRole("heading", { name: /Make room/ }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".theme-sun")).toHaveCSS("opacity", "1");
      await expect(page.locator(".theme-moon")).toHaveCSS("opacity", "0");
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "rgb(23, 25, 24)",
      );
      await expect(page.locator(".empty-paper")).toHaveCSS(
        "background-color",
        "rgb(36, 40, 35)",
      );
    } finally {
      release();
    }
    await expectTheme(page, "dark");
    await toggle(page).click();
    await expectTheme(page, "light");
  });
}

test("dark home and upload dialog remain usable at desktop, tablet, and mobile widths", async ({
  page,
}) => {
  await mkdir("artifacts", { recursive: true });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expectTheme(page, "dark");
  await page.screenshot({ path: "artifacts/dark-home.png" });
  await page.getByRole("button", { name: "Open paper", exact: true }).click();
  await expect(page.locator(".dialog-content")).toHaveCSS(
    "background-color",
    "rgb(32, 35, 32)",
  );
  await expect(page.getByLabel("Choose a local PDF")).toBeVisible();
  const borderContrast = await page
    .getByRole("textbox")
    .first()
    .evaluate((input) => {
      const style = getComputedStyle(input);
      function luminance(color: string) {
        const channels = color.match(/\d+/g)?.slice(0, 3).map(Number);
        if (!channels || channels.length !== 3)
          throw new Error(`Unsupported color: ${color}`);
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      }
      return (
        (luminance(style.borderTopColor) + 0.05) /
        (luminance(style.backgroundColor) + 0.05)
      );
    });
  expect(borderContrast).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: "artifacts/dark-upload.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (const [width, height, name] of [
    [768, 1024, "tablet"],
    [390, 844, "mobile"],
    [320, 740, "narrow"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(toggle(page)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".empty-paper h1")
        .evaluate((heading) => heading.scrollWidth <= heading.clientWidth),
    ).toBe(true);
    const header = await page.locator(".app-header").boundingBox();
    expect(header?.height).toBe(width <= 700 ? 72 : 76);
    await page
      .getByRole("button", { name: "Show glossary", exact: true })
      .click();
    const panel = page.getByRole("complementary", { name: "Saved glossary" });
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds?.y).toBe(header?.height);
    await page.getByRole("button", { name: "Close glossary" }).click();
    await page.screenshot({ path: `artifacts/dark-home-${name}.png` });
  }
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Paper navigation" }),
  ).toBeVisible();
  expect((await page.locator(".library-sidebar").boundingBox())?.y).toBe(72);
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.getByRole("button", { name: "Open paper", exact: true }).click();
  await expect(page.getByLabel("Choose a local PDF")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
