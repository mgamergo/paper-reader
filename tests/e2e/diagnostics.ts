import { expect, type Page } from "@playwright/test";

export function observeBrowser(page: Page) {
  const expectedCancellations: string[] = [];
  const diagnostics: Record<
    "consoleErrors" | "pageErrors" | "failedRequests" | "httpErrors",
    string[]
  > = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error")
      diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    diagnostics.failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      diagnostics.httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return {
    diagnostics,
    expectedCancellations,
    assertClean() {
      expect(diagnostics).toEqual({
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        httpErrors: [],
      });
    },
  };
}
