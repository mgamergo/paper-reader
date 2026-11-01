import { describe, expect, test } from "bun:test";
import {
  arxivInputSchema,
  isPdf,
  parseArxivId,
  readBoundedBody,
} from "../../src/lib/arxiv";
import {
  assistanceRequestSchema,
  assistanceResultSchema,
  languages,
  type AssistanceRequest,
} from "../../src/lib/contracts";
import { demoAssistance } from "../../src/lib/assistance/demo";
import {
  contextSentence,
  decodeGlossary,
  encodeGlossary,
  saveTerm,
  type GlossaryEntry,
} from "../../src/lib/glossary";
import {
  extractParagraphs,
  inferMetadata,
  inferTitle,
  paragraphForQuote,
} from "../../src/lib/pdf/paragraphs";

const request: AssistanceRequest = {
  kind: "explain",
  language: "hi",
  difficulty: "easy",
  paper: {
    title: "Attention Is All You Need",
    abstract: "A sequence transduction model based on attention.",
  },
  selection: {
    quote: "attention",
    paragraph:
      "We propose the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    page: 1,
  },
};
describe("arXiv boundary", () => {
  test.each([
    "1706.03762",
    "1706.03762v7",
    "0704.0001",
    "1412.1234",
    "1501.12345",
    "hep-th/9901001",
    "math/0309136",
    "https://arxiv.org/abs/1706.03762",
    "https://arxiv.org/pdf/1706.03762v7.pdf",
    "https://export.arxiv.org/pdf/hep-th/9901001",
  ])("accepts %s", (input) =>
    expect(arxivInputSchema.safeParse(input).success).toBe(true),
  );
  test.each([
    "1700.03762",
    "1713.03762",
    "1706.00000",
    "0703.1234",
    "9901.12345",
    "hep-th/1701001",
    "https://evil.test/pdf/1706.03762",
    "https://arxiv.org.evil.test/abs/1706.03762",
    "http://arxiv.org/abs/1706.03762",
    "https://arxiv.org:444/abs/1706.03762",
    "https://name:password@arxiv.org/abs/1706.03762",
    "https://arxiv.org/abs/1706.03762?x=1",
    "https://arxiv.org/pdf/../foo",
    "file:///etc/passwd",
    "1706.03762/../../secret",
  ])("rejects %s", (input) =>
    expect(arxivInputSchema.safeParse(input).success).toBe(false),
  );
  test("normalizes only the ID", () =>
    expect(parseArxivId(" arXiv:1706.03762v7 ")).toBe("1706.03762v7"));
  test("rejects oversized streamed bodies without trusting content length", async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(8));
          controller.enqueue(new Uint8Array(8));
          controller.close();
        },
      }),
    );
    await expect(readBoundedBody(response, 10)).rejects.toThrow("exceeds");
  });
  test("requires PDF magic", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(isPdf(new TextEncoder().encode("<html>Not a PDF</html>"))).toBe(
      false,
    );
  });
});
describe("assistance", () => {
  test("requests are validated", () => {
    expect(assistanceRequestSchema.safeParse(request).success).toBe(true);
    expect(
      assistanceRequestSchema.safeParse({
        ...request,
        selection: { ...request.selection, paragraph: "" },
      }).success,
    ).toBe(false);
  });
  test.each(languages)("curated explanation validates for $label", ({ id }) => {
    const result = assistanceResultSchema.parse(
      demoAssistance({
        ...request,
        language:
          id === "en" ||
          id === "hi" ||
          id === "te" ||
          id === "mr" ||
          id === "ta"
            ? id
            : "en",
      }),
    );
    expect(result.source).toBe("mock");
    expect(result.english).toContain("weights");
    expect(result.native === null).toBe(id === "en");
  });
  test.each(["attention", "transduction", "recurrent", "Transformer"])(
    "has accurate curated concept %s",
    (quote) => {
      const result = demoAssistance({
        ...request,
        selection: { ...request.selection, quote },
      });
      expect(result.note).toContain("Curated");
      expect(result.definitions.length).toBeGreaterThan(0);
    },
  );
  test("unknown terms remain honest", () => {
    const result = demoAssistance({
      ...request,
      selection: { ...request.selection, quote: "banana" },
    });
    expect(result.english).toContain("no curated explanation");
    expect(result.note).toContain("Generic");
  });
  test("does not apply Attention definitions to unrelated papers", () => {
    const result = demoAssistance({
      ...request,
      paper: { title: "Visual attention in children", abstract: "" },
      selection: {
        quote: "attention",
        paragraph: "Children paid attention to the red dot.",
        page: 1,
      },
    });
    expect(result.definitions).toHaveLength(0);
  });
  test("simplification uses the current paragraph and keeps technical terms", () => {
    const result = demoAssistance({ ...request, kind: "simplify" });
    expect(result.english).toContain("Transformer");
    expect(result.english).toContain("attention");
    expect(result.english).toContain("recurrence");
    expect(result.english).not.toContain("dispensing with");
    const changed = demoAssistance({
      ...request,
      kind: "simplify",
      selection: {
        ...request.selection,
        paragraph: "We utilize an encoder to measure 42 samples.",
      },
    });
    expect(changed.english).toContain("42 samples");
    expect(changed.english).not.toContain("Transformer");
  });
});
describe("glossary persistence", () => {
  const entry: GlossaryEntry = {
    id: "one",
    term: "Attention",
    context: request.selection.paragraph,
    paperId: "arxiv:1706.03762",
    paperTitle: request.paper.title,
    page: 1,
    language: "hi",
    result: demoAssistance(request),
    savedAt: "2026-11-01T00:00:00.000Z",
  };
  test("round trips and deduplicates per paper and language", () => {
    const updated = saveTerm([entry], {
      ...entry,
      id: "two",
      term: " attention ",
      page: 2,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe("one");
    expect(updated[0]?.page).toBe(2);
    expect(decodeGlossary(encodeGlossary(updated))).toEqual(updated);
    expect(saveTerm(updated, { ...entry, language: "te" })).toHaveLength(2);
  });
  test("rejects corrupt and incompatible storage", () => {
    expect(() => decodeGlossary("garbage")).toThrow();
    expect(() => decodeGlossary('{"version":2,"entries":[]}')).toThrow();
    expect(decodeGlossary(null)).toEqual([]);
  });
  test("captures context sentence", () =>
    expect(
      contextSentence(
        "First sentence. Attention connects words. Last sentence.",
        "attention",
      ),
    ).toBe("Attention connects words."));
});
describe("PDF text extraction", () => {
  test("finds the title by typography before a legal preface and an abstract without a same-page introduction", () => {
    const title = inferTitle([
      {
        str: "arXiv:1706.03762v7",
        rotation: Math.PI / 2,
        x: 10,
        y: 800,
        width: 200,
        height: 25,
        hasEOL: true,
      },
      {
        str: "Attention Is All You Need",
        x: 50,
        y: 750,
        width: 300,
        height: 18,
        hasEOL: true,
      },
      {
        str: "Author names",
        x: 50,
        y: 700,
        width: 100,
        height: 12,
        hasEOL: true,
      },
    ]);
    expect(title).toBe("Attention Is All You Need");
    const paragraphs = [
      "Provided proper attribution is provided",
      "Attention Is All You Need",
      "Abstract",
      "The actual abstract ends before a footnote.",
      "∗ Equal contribution.",
    ].map((text, index) => ({
      id: String(index),
      page: 1,
      text,
      heading: text === "Abstract",
    }));
    const metadata = inferMetadata(
      [{ page: 1, paragraphs, titleCandidate: title }],
      "",
      "1706.03762",
    );
    expect(metadata.title).toBe(title);
    expect(metadata.abstract).toBe(
      "The actual abstract ends before a footnote.",
    );
  });
  test("groups nearby lines and keeps paragraph gaps", () => {
    const paragraphs = extractParagraphs(
      [
        {
          str: "A technical sentence",
          x: 30,
          y: 700,
          width: 120,
          height: 10,
          hasEOL: true,
        },
        {
          str: "continues on a new line.",
          x: 30,
          y: 688,
          width: 120,
          height: 10,
          hasEOL: true,
        },
        {
          str: "Another paragraph.",
          x: 30,
          y: 660,
          width: 120,
          height: 10,
          hasEOL: true,
        },
      ],
      3,
    );
    expect(paragraphs.map((item) => item.text)).toEqual([
      "A technical sentence continues on a new line.",
      "Another paragraph.",
    ]);
    expect(paragraphs[0]?.page).toBe(3);
    expect(paragraphForQuote(paragraphs, "technical sentence")).toContain(
      "continues",
    );
  });
  test("extracts real title and abstract instead of substituting demo text", () => {
    const paragraphs = [
      "My paper",
      "Abstract",
      "This is the actual abstract.",
      "1 Introduction",
      "More text.",
    ].map((text, index) => ({ id: `${index}`, page: 1, text, heading: false }));
    expect(inferMetadata([{ page: 1, paragraphs }], "", "file.pdf")).toEqual({
      title: "My paper",
      abstract: "This is the actual abstract.",
    });
  });
});
