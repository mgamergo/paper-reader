import type { ExtractedPage, PaperMetadata, Paragraph } from "../contracts";

export type TextFragment = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
  rotation?: number;
};
type Line = { text: string; x: number; y: number; height: number };
export function extractParagraphs(
  items: TextFragment[],
  page: number,
): Paragraph[] {
  const lines: Line[] = [];
  let line: Line | undefined;
  for (const item of items) {
    if (!item.str.trim()) continue;
    if (
      !line ||
      Math.abs(item.y - line.y) > Math.max(2, item.height * 0.35) ||
      item.x < line.x - 20
    ) {
      line = { text: item.str, x: item.x, y: item.y, height: item.height };
      lines.push(line);
    } else {
      line.text += `${line.text.endsWith(" ") || item.str.startsWith(" ") ? "" : " "}${item.str}`;
      line.height = Math.max(line.height, item.height);
    }
    if (item.hasEOL) line = undefined;
  }
  const paragraphs: Paragraph[] = [];
  let buffer = "";
  let previous: Line | undefined;
  function flush() {
    const text = buffer.replace(/\s+/g, " ").trim();
    if (text)
      paragraphs.push({
        id: `${page}-${paragraphs.length}`,
        page,
        text,
        heading:
          /^(?:\d+(?:\.\d+)*\s+)?(?:abstract|introduction|background|model architecture|attention|conclusion|references|related work|training|results|experiments|self-attention|why self-attention)[\s\w:.-]*$/i.test(
            text,
          ) && text.length < 100,
      });
    buffer = "";
  }
  for (const current of lines) {
    const gap = previous ? Math.abs(previous.y - current.y) : 0;
    const heading =
      current.text.length < 100 &&
      /^(?:\d+(?:\.\d+)*\s+\D|Abstract$|References$)/.test(current.text);
    const columnChange =
      previous &&
      (current.y > previous.y + previous.height * 2 ||
        current.x < previous.x - 120);
    if (
      previous &&
      (gap > Math.max(previous.height, current.height) * 1.65 ||
        heading ||
        columnChange ||
        previous.height > current.height * 1.25)
    )
      flush();
    buffer += `${buffer && !buffer.endsWith("-") ? " " : ""}${current.text}`;
    if (heading) flush();
    previous = current;
  }
  flush();
  return paragraphs;
}
export function inferTitle(items: TextFragment[]): string {
  const horizontal = items.filter((item) => Math.abs(item.rotation ?? 0) < 0.2);
  const largest = horizontal.reduce(
    (height, item) => Math.max(height, item.height),
    0,
  );
  const largeItems = horizontal.filter(
    (item) => item.height >= largest * 0.9 && item.str.trim(),
  );
  const first = largeItems[0];
  if (!first) return "";
  return largeItems
    .filter((item) => Math.abs(item.y - first.y) < largest * 2)
    .map((item) => item.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
export function inferMetadata(
  pages: ExtractedPage[],
  pdfTitle: string,
  filename: string,
): PaperMetadata {
  const first = pages[0]?.paragraphs ?? [];
  const abstractIndex = first.findIndex((item) =>
    /^Abstract\b/i.test(item.text),
  );
  const abstractParts: string[] = [];
  if (abstractIndex >= 0) {
    const initial = first[abstractIndex]?.text
      .replace(/^Abstract\s*/i, "")
      .trim();
    if (initial) abstractParts.push(initial);
    for (const paragraph of first.slice(abstractIndex + 1)) {
      if (
        paragraph.heading ||
        /^(?:[∗*†‡]|\d+\s+|References\b|Acknowledg|arXiv:|\d+(?:st|nd|rd|th) Conference)/i.test(
          paragraph.text,
        )
      )
        break;
      abstractParts.push(paragraph.text);
    }
  }
  const firstUseful = first.find(
    (item) =>
      item.text.length > 3 &&
      item.text.length < 200 &&
      !/^(?:arxiv:|submitted|published|provided|copyright|permission)/i.test(
        item.text,
      ),
  );
  return {
    title: (
      pdfTitle.trim() ||
      pages[0]?.titleCandidate ||
      firstUseful?.text ||
      filename.replace(/\.pdf$/i, "")
    ).slice(0, 500),
    abstract: abstractParts.join(" ").slice(0, 6000),
  };
}

export function paragraphForQuote(
  paragraphs: Paragraph[],
  quote: string,
): string {
  const normalize = (text: string) => text.toLowerCase().replace(/[-\s]+/g, "");
  return (
    paragraphs.find((item) => normalize(item.text).includes(normalize(quote)))
      ?.text ?? quote
  );
}
