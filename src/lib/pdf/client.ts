import type { PDFDocumentProxy } from "pdfjs-dist";
import { extractParagraphs, inferMetadata, inferTitle } from "./paragraphs";
import type { ExtractedPage, PaperMetadata } from "../contracts";

export async function extractPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<ExtractedPage> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const fragments = content.items.flatMap((item) =>
    "str" in item
      ? [
          {
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            hasEOL: item.hasEOL,
            rotation: Math.atan2(item.transform[1], item.transform[0]),
          },
        ]
      : [],
  );
  return {
    page: pageNumber,
    paragraphs: extractParagraphs(fragments, pageNumber),
    titleCandidate: inferTitle(fragments),
  };
}
export async function openPdf(
  bytes: Uint8Array,
  filename: string,
  signal: AbortSignal,
): Promise<{
  pdf: PDFDocumentProxy;
  firstPage: ExtractedPage;
  metadata: PaperMetadata;
}> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  signal.throwIfAborted();
  const loading = pdfjs.getDocument({
    data: bytes.slice(),
    useSystemFonts: true,
  });
  const abort = () => {
    void loading.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > 500) {
      await pdf.loadingTask.destroy();
      throw new Error("This prototype supports PDFs up to 500 pages.");
    }
    const firstPage = await extractPage(pdf, 1);
    const metadata = await pdf.getMetadata();
    const title =
      typeof metadata.info === "object" &&
      metadata.info !== null &&
      "Title" in metadata.info &&
      typeof metadata.info.Title === "string"
        ? metadata.info.Title
        : "";
    signal.throwIfAborted();
    return {
      pdf,
      firstPage,
      metadata: inferMetadata([firstPage], title, filename),
    };
  } catch (error) {
    await loading.destroy();
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
