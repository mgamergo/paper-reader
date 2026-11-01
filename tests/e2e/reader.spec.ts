import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { observeBrowser } from "./diagnostics";

const evidence = path.join(process.cwd(), "artifacts");
const test = base.extend<{ browserLog: ReturnType<typeof observeBrowser> }>({
  browserLog: [
    async ({ page }, use, testInfo) => {
      const log = observeBrowser(page);
      await use(log);
      await testInfo.attach("browser-diagnostics", {
        body: JSON.stringify(
          {
            ...log.diagnostics,
            expectedCancellations: log.expectedCancellations,
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      log.assertClean();
    },
    { auto: true },
  ],
});

test.use({ colorScheme: "dark" });

let attentionPdf: Buffer;
test.beforeAll(async ({ request }) => {
  await mkdir(evidence, { recursive: true });
  const response = await request.get("/api/arxiv?id=1706.03762");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  attentionPdf = await response.body();
  expect(attentionPdf.subarray(0, 5).toString()).toBe("%PDF-");
});

const help = (page: Page) =>
  page.getByRole("dialog", { name: "Selection help" });
const abstract = (page: Page) =>
  page
    .locator("[data-paragraph]")
    .filter({ hasText: /^The dominant sequence/ });

async function upload(page: Page) {
  await page.getByRole("button", { name: "Open paper", exact: true }).click();
  await page.getByLabel("Choose a local PDF").setInputFiles({
    name: "attention.pdf",
    mimeType: "application/pdf",
    buffer: attentionPdf,
  });
  await expect(
    page.getByRole("heading", {
      name: "Attention Is All You Need",
      exact: true,
    }),
  ).toBeVisible();
  await expect(abstract(page)).toBeVisible();
}

async function selectWord(page: Page, paragraph: Locator, word: string) {
  await paragraph.scrollIntoViewIfNeeded();
  const point = await paragraph.evaluate((element, quote) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent?.indexOf(quote) ?? -1;
      if (start < 0) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + quote.length);
      const rect = range.getClientRects()[0];
      if (!rect) throw new Error("Selection has no visible rectangle.");
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    throw new Error(`Cannot find ${quote} in selected paragraph.`);
  }, word);
  await page.mouse.dblclick(point.x, point.y);
  await expect(
    help(page).getByRole("heading", { name: word, exact: true }),
  ).toBeVisible();
}

async function explain(page: Page) {
  await help(page)
    .getByRole("button", { name: "Explain selection", exact: true })
    .click();
  await expect(help(page).getByTestId("assistance-result")).toBeVisible();
  await expect(help(page)).toContainText("Demo response");
}

async function closeHelp(page: Page) {
  await page.getByRole("button", { name: "Close selection help" }).click();
  await expect(help(page)).toHaveCount(0);
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("real arXiv selections, bilingual help, simplification, PDF and persisted flashcards", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Read Attention Is All You Need" })
    .click();
  await expect(abstract(page)).toBeVisible();
  await expect(page.locator(".document-sheet")).toHaveCSS(
    "background-color",
    "rgb(36, 40, 35)",
  );
  await page.screenshot({ path: path.join(evidence, "dark-reader.png") });
  await expect(
    page.getByRole("combobox", { name: "Page", exact: true }).locator("option"),
  ).toHaveCount(15);
  await page.getByRole("button", { name: "Edit metadata" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Attention Is All You Need",
  );
  await expect(page.getByLabel("Abstract", { exact: true })).toHaveValue(
    /sequence transduction/,
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("combobox", { name: "Native language" })
    .selectOption("en");
  await selectWord(page, abstract(page), "transduction");
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/assistance") && request.method() === "POST",
  );
  await explain(page);
  const payload: unknown = (await requestPromise).postDataJSON();
  expect(payload).toMatchObject({
    kind: "explain",
    language: "en",
    paper: {
      title: "Attention Is All You Need",
      abstract: expect.stringContaining("sequence transduction"),
    },
    selection: {
      quote: "transduction",
      page: 1,
      paragraph: expect.stringContaining("complex recurrent"),
    },
  });
  await expect(help(page)).toContainText(
    "Converting an input sequence into an output sequence",
  );
  await page.screenshot({ path: path.join(evidence, "dark-explanation.png") });
  await closeHelp(page);
  await page
    .getByRole("combobox", { name: "Native language" })
    .selectOption("hi");
  await selectWord(page, abstract(page), "transduction");
  await explain(page);
  await expect(help(page).locator('[lang="hi"]')).toContainText(
    "इनपुट अनुक्रम",
  );
  await expect(help(page)).toContainText("In English");
  await page.screenshot({ path: path.join(evidence, "dark-hindi.png") });
  await closeHelp(page);
  await selectWord(page, abstract(page), "attention");
  await explain(page);
  await closeHelp(page);
  const glossary = page.getByRole("complementary", { name: "Saved glossary" });
  await expect(glossary.locator(".glossary-entry")).toHaveCount(3);
  await glossary
    .getByRole("button", { name: "attention", exact: true })
    .click();
  await expect(glossary.locator("blockquote")).toContainText(
    "attention mechanism",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(evidence, "dark-glossary.png") });
  const outline = page.getByRole("navigation", { name: "Paper pages" });
  await outline
    .getByRole("button", { name: "Page 15", exact: true })
    .scrollIntoViewIfNeeded();
  const lastPage = await outline
    .getByRole("button", { name: "Page 15", exact: true })
    .boundingBox();
  const footer = await page.locator(".sidebar-footer").boundingBox();
  expect(
    lastPage && footer && lastPage.y + lastPage.height <= footer.y,
  ).toBeTruthy();
  await page
    .getByRole("combobox", { name: "Page", exact: true })
    .selectOption("2");
  const paragraph = page
    .locator("[data-paragraph]")
    .filter({ hasText: /^In this work/ })
    .first();
  await expect(paragraph).toBeVisible();
  const original = await paragraph.innerText();
  await paragraph
    .locator("..")
    .getByRole("button", { name: "Simplify paragraph", exact: true })
    .click();
  await expect(page.locator(".simplified-paragraph")).toBeVisible();
  await help(page)
    .getByText("Simplification level: easy", { exact: true })
    .click();
  const slider = help(page).getByRole("slider");
  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "2");
  await help(page)
    .getByRole("button", { name: "Simplify paragraph", exact: true })
    .click();
  await help(page).getByText("Original paragraph", { exact: true }).click();
  await expect(help(page).locator(".original-paragraph")).toBeVisible();
  await expect(help(page).locator(".original-paragraph")).toHaveText(original);
  await expect(page.locator(".simplified-paragraph")).toHaveText(original);
  await slider.focus();
  await slider.press("Home");
  await help(page)
    .getByRole("button", { name: "Simplify paragraph", exact: true })
    .click();
  await expect(page.locator(".simplified-paragraph")).not.toHaveText(original);
  await page.locator(".simplified-paragraph").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, "dark-simplified.png") });
  const definitionButton = help(page)
    .getByRole("button", { name: /^Define attention$/i })
    .first();
  await definitionButton.click();
  await expect(
    page
      .getByText(
        "A mechanism that gives different weights to relevant parts of an input when forming a representation. It lets a model use information from other positions in a sequence.",
        { exact: true },
      )
      .last(),
  ).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "dark-definition.png") });
  await page.keyboard.press("Escape");
  await closeHelp(page);
  await page
    .getByRole("combobox", { name: "Page", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  const pdfText = page
    .locator(".textLayer span")
    .filter({ hasText: /attention mechanism/ })
    .first();
  await expect(pdfText).toBeVisible();
  await expect(page.locator('[data-testid="pdf-page"] canvas')).toHaveAttribute(
    "width",
    /^[1-9]\d*$/,
  );
  await expect(page.locator(".pdf-color-note")).toContainText(
    "Original PDF colors are preserved",
  );
  await expect(page.locator(".pdf-page-canvas canvas")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(pdfText).toHaveCSS("color", "rgba(0, 0, 0, 0)");
  await page.screenshot({ path: path.join(evidence, "dark-pdf.png") });
  await selectWord(page, pdfText, "attention");
  await help(page)
    .getByText("Inspect or correct context", { exact: true })
    .click();
  await expect(page.getByLabel("Surrounding paragraph")).toHaveValue(
    /^The dominant sequence transduction.*complex recurrent/,
  );
  await explain(page);
  await closeHelp(page);
  await page
    .getByRole("combobox", { name: "Page", exact: true })
    .selectOption("3");
  await expect(page.getByLabel("Selectable text for PDF page 3")).toBeVisible();
  await noOverflow(page);
  await page.reload();
  await expect(glossary.locator(".glossary-entry")).toHaveCount(3);
  await glossary.getByRole("button", { name: "Review flashcards" }).click();
  await page.getByRole("button", { name: "Reveal meaning" }).click();
  await expect(page.getByTestId("flashcard-answer")).toContainText(
    "gives different weights",
  );
  await expect(page.locator(".dialog-content")).toHaveCSS(
    "background-color",
    "rgb(32, 35, 32)",
  );
  await page.screenshot({ path: path.join(evidence, "dark-flashcards.png") });
  await page.getByRole("button", { name: "Next card" }).click();
  await expect(page.getByTestId("flashcard-answer")).toHaveCount(0);
  await expect(page.getByText("Card 2 of 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await glossary
    .getByRole("button", { name: "Remove attention", exact: true })
    .click();
  await page.reload();
  await expect(glossary.locator(".glossary-entry")).toHaveCount(2);
});

test("upload, all native languages, metadata, tablet and mobile controls", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await upload(page);
  const scripts = [
    { language: "te", text: "ఇన్‌పుట్" },
    { language: "mr", text: "इनपुट" },
    { language: "ta", text: "உள்ளீட்டு" },
  ];
  for (const { language, text } of scripts) {
    await page
      .getByRole("combobox", { name: "Native language" })
      .selectOption(language);
    await selectWord(page, abstract(page), "transduction");
    await explain(page);
    await expect(help(page).locator(`[lang="${language}"]`)).toContainText(
      text,
    );
    await closeHelp(page);
  }
  await page.getByRole("button", { name: "Edit metadata" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Attention Is All You Need (my reading copy)");
  await page.getByRole("button", { name: "Save paper context" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Attention Is All You Need (my reading copy)",
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await noOverflow(page);
  await page
    .getByRole("button", { name: "Show glossary", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Saved glossary" }),
  ).toBeVisible();
  await page.screenshot({ path: path.join(evidence, "dark-tablet.png") });
  await page.getByRole("button", { name: "Close glossary" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await noOverflow(page);
  await page.getByRole("button", { name: "Pages", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Paper pages" })
    .getByRole("button", { name: "Page 2", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Page", exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Page", exact: true })
    .selectOption("1");
  await page
    .getByRole("combobox", { name: "Native language" })
    .selectOption("hi");
  await selectWord(page, abstract(page), "transduction");
  await explain(page);
  await help(page).locator('[lang="hi"]').scrollIntoViewIfNeeded();
  await expect(help(page).locator('[lang="hi"]')).toContainText("इनपुट");
  const bounds = await help(page).boundingBox();
  expect(
    bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390,
  ).toBeTruthy();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidence, "dark-mobile.png") });
  await closeHelp(page);
  await page
    .getByRole("button", { name: "Show glossary", exact: true })
    .click();
  await expect(
    page
      .getByRole("complementary", { name: "Saved glossary" })
      .getByRole("button", { name: "Review flashcards" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close glossary" }).click();
});

test("obsolete responses never display or save, and damaged storage recovers", async ({
  page,
  browserLog,
}) => {
  await page.goto("/");
  await upload(page);
  await selectWord(page, abstract(page), "transduction");
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    intercepted = resolve;
  });
  await page.route(
    "**/api/assistance",
    async (route) => {
      const response = await route.fetch();
      intercepted?.();
      await gate;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await help(page)
    .getByRole("button", { name: "Explain selection", exact: true })
    .click();
  await started;
  await page
    .getByRole("combobox", { name: "Native language" })
    .selectOption("ta");
  release?.();
  await expect(help(page).getByTestId("assistance-result")).toHaveCount(0);
  await explain(page);
  await expect(help(page).locator('[lang="ta"]')).toContainText("உள்ளீட்டு");
  await closeHelp(page);
  await expect(page.locator(".glossary-entry")).toHaveCount(1);
  await expect(page.locator(".entry-language")).toContainText(
    "English + Tamil",
  );
  expect(browserLog.diagnostics.failedRequests).toHaveLength(1);
  expect(browserLog.diagnostics.failedRequests[0]).toMatch(
    /POST .*\/api\/assistance: net::ERR_ABORTED$/,
  );
  browserLog.expectedCancellations.push(
    ...browserLog.diagnostics.failedRequests.splice(0, 1),
  );
  await page.evaluate(() =>
    localStorage.setItem("margin.glossary.v1", "damaged-json"),
  );
  await page.reload();
  await expect(
    page
      .getByRole("complementary", { name: "Saved glossary" })
      .getByRole("alert"),
  ).toContainText("Saved glossary could not be read");
  await page
    .getByRole("button", { name: "Reset storage and save session" })
    .click();
  await expect(
    page.getByText("Saved glossary could not be read", { exact: false }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".glossary-entry")).toHaveCount(0);
});

test("API rejects invalid inputs and returns labeled context-aware demo output", async ({
  request,
}) => {
  const invalidId = await request.get(
    "/api/arxiv?id=https%3A%2F%2Fexample.com%2Fpaper.pdf",
  );
  expect(invalidId.status()).toBe(400);
  const malformed = await request.post("/api/assistance", { data: "{" });
  expect(malformed.status()).toBe(400);
  const missing = await request.post("/api/assistance", { data: {} });
  expect(missing.status()).toBe(400);
  const oversized = await request.post("/api/assistance", {
    data: "x".repeat(28001),
  });
  expect(oversized.status()).toBe(413);
  const response = await request.post("/api/assistance", {
    data: {
      kind: "explain",
      language: "hi",
      difficulty: "easy",
      paper: {
        title: "Attention Is All You Need",
        abstract: "A sequence transduction model.",
      },
      selection: {
        quote: "transduction",
        paragraph:
          "Sequence transduction models convert one sequence to another.",
        page: 1,
      },
    },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    source: "mock",
    native: { language: "hi" },
    english: expect.stringContaining("input sequence"),
  });
});
