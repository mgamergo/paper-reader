"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  apiErrorSchema,
  assistanceResultSchema,
  type AssistanceRequest,
  type AssistanceResult,
  type AsyncState,
  type Difficulty,
  type ExtractedPage,
  type Language,
  type Paper,
  type PaperMetadata,
  type PaperSource,
  type ReaderSelection,
} from "@/lib/contracts";
import { isPdf, MAX_PDF_BYTES, parseArxivId } from "@/lib/arxiv";
import { extractPage, openPdf } from "@/lib/pdf/client";
import { contextSentence, type GlossaryEntry } from "@/lib/glossary";

type OpenDocument = {
  paper: Paper;
  pdf: PDFDocumentProxy;
  firstPage: ExtractedPage;
};
export function useReader(saveGlossary: (entry: GlossaryEntry) => void) {
  const [document, setDocument] = useState<AsyncState<OpenDocument>>({
    kind: "idle",
  });
  const [page, setPage] = useState(1);
  const [pageContent, setPageContent] = useState<AsyncState<ExtractedPage>>({
    kind: "idle",
  });
  const [selection, setSelection] = useState<ReaderSelection | null>(null);
  const [assistance, setAssistance] = useState<
    AsyncState<{ request: AssistanceRequest; result: AssistanceResult }>
  >({ kind: "idle" });
  const [language, setLanguage] = useState<Language>("hi");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const importAbort = useRef<AbortController | null>(null);
  const assistanceAbort = useRef<AbortController | null>(null);
  const currentPdf = useRef<PDFDocumentProxy | null>(null);
  const importGeneration = useRef(0);
  const assistanceGeneration = useRef(0);
  useEffect(
    () => () => {
      importAbort.current?.abort();
      assistanceAbort.current?.abort();
      void currentPdf.current?.loadingTask.destroy();
    },
    [],
  );
  const invalidateAssistance = useCallback(() => {
    assistanceAbort.current?.abort();
    assistanceGeneration.current++;
    setAssistance({ kind: "idle" });
  }, []);
  const chooseSelection = useCallback(
    (next: ReaderSelection | null) => {
      invalidateAssistance();
      setSelection(next);
    },
    [invalidateAssistance],
  );
  async function loadPaper(
    source: PaperSource,
    getBytes: (signal: AbortSignal) => Promise<Uint8Array>,
  ) {
    importAbort.current?.abort();
    invalidateAssistance();
    setSelection(null);
    const controller = new AbortController();
    importAbort.current = controller;
    const generation = ++importGeneration.current;
    setDocument({ kind: "loading" });
    setPageContent({ kind: "idle" });
    if (currentPdf.current) {
      void currentPdf.current.loadingTask.destroy();
      currentPdf.current = null;
    }
    try {
      const bytes = await getBytes(controller.signal);
      if (bytes.byteLength > MAX_PDF_BYTES)
        throw new Error("Choose a PDF smaller than 20 MB.");
      if (!isPdf(bytes))
        throw new Error("This file is not a PDF. Choose a valid PDF document.");
      const loaded = await openPdf(
        bytes,
        source.kind === "upload" ? source.filename : source.id,
        controller.signal,
      );
      if (
        generation !== importGeneration.current ||
        controller.signal.aborted
      ) {
        await loaded.pdf.loadingTask.destroy();
        return;
      }
      const id =
        source.kind === "arxiv"
          ? `arxiv:${source.id.replace(/v\d+$/, "")}`
          : `upload:${Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", bytes.slice()),
              ),
            )
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("")}`;
      if (
        generation !== importGeneration.current ||
        controller.signal.aborted
      ) {
        await loaded.pdf.loadingTask.destroy();
        return;
      }
      currentPdf.current = loaded.pdf;
      setPage(1);
      setDocument({
        kind: "success",
        data: { ...loaded, paper: { ...loaded.metadata, id, source, bytes } },
      });
    } catch (error) {
      if (generation !== importGeneration.current || controller.signal.aborted)
        return;
      setDocument({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Could not open the PDF.",
      });
    }
  }
  async function importArxiv(input: string) {
    let id: string;
    try {
      id = parseArxivId(input);
    } catch (error) {
      importAbort.current?.abort();
      importGeneration.current++;
      invalidateAssistance();
      setSelection(null);
      setPageContent({ kind: "idle" });
      if (currentPdf.current) {
        void currentPdf.current.loadingTask.destroy();
        currentPdf.current = null;
      }
      setDocument({
        kind: "error",
        message: error instanceof Error ? error.message : "Invalid arXiv ID.",
      });
      return;
    }
    await loadPaper(
      { kind: "arxiv", id, url: `https://arxiv.org/abs/${id}` },
      async (signal) => {
        const response = await fetch(
          `/api/arxiv?id=${encodeURIComponent(id)}`,
          { signal },
        );
        if (!response.ok) {
          const error = apiErrorSchema.safeParse(await response.json());
          throw new Error(
            error.success
              ? error.data.error
              : "Could not download the arXiv PDF.",
          );
        }
        return new Uint8Array(await response.arrayBuffer());
      },
    );
  }
  async function upload(file: File) {
    await loadPaper({ kind: "upload", filename: file.name }, async () => {
      if (file.size > MAX_PDF_BYTES)
        throw new Error("Choose a PDF smaller than 20 MB.");
      return new Uint8Array(await file.arrayBuffer());
    });
  }
  useEffect(() => {
    if (document.kind !== "success") return;
    let obsolete = false;
    async function read() {
      setPageContent({ kind: "loading" });
      try {
        const data =
          document.kind === "success"
            ? page === 1
              ? document.data.firstPage
              : await extractPage(document.data.pdf, page)
            : null;
        if (!obsolete && data) setPageContent({ kind: "success", data });
      } catch {
        if (!obsolete)
          setPageContent({
            kind: "error",
            message:
              "Could not extract this page. Try PDF view or another page.",
          });
      }
    }
    void read();
    return () => {
      obsolete = true;
    };
  }, [document, page]);
  function goToPage(next: number) {
    if (document.kind !== "success") return;
    chooseSelection(null);
    setPage(Math.max(1, Math.min(document.data.pdf.numPages, next)));
  }
  function changeLanguage(next: Language) {
    invalidateAssistance();
    setLanguage(next);
  }
  function changeDifficulty(next: Difficulty) {
    invalidateAssistance();
    setDifficulty(next);
  }
  function updateMetadata(metadata: PaperMetadata) {
    invalidateAssistance();
    setDocument((previous) =>
      previous.kind === "success"
        ? {
            ...previous,
            data: {
              ...previous.data,
              paper: { ...previous.data.paper, ...metadata },
            },
          }
        : previous,
    );
  }
  async function explain(
    kind: AssistanceRequest["kind"],
    selected: ReaderSelection | null = selection,
  ) {
    if (
      document.kind !== "success" ||
      !selected ||
      !selected.quote.trim() ||
      !selected.paragraph.trim()
    )
      return;
    assistanceAbort.current?.abort();
    const controller = new AbortController();
    assistanceAbort.current = controller;
    const generation = ++assistanceGeneration.current;
    const request: AssistanceRequest = {
      kind,
      selection: selected,
      paper: {
        title: document.data.paper.title,
        abstract: document.data.paper.abstract,
      },
      language,
      difficulty,
    };
    setAssistance({ kind: "loading" });
    try {
      const response = await fetch("/api/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const raw: unknown = await response.json();
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(raw);
        throw new Error(
          error.success ? error.data.error : "The explanation request failed.",
        );
      }
      const result = assistanceResultSchema.parse(raw);
      if (
        generation !== assistanceGeneration.current ||
        controller.signal.aborted
      )
        return;
      setAssistance({ kind: "success", data: { request, result } });
      if (kind === "explain")
        saveGlossary({
          id: crypto.randomUUID(),
          term: selected.quote,
          context: contextSentence(selected.paragraph, selected.quote),
          paperId: document.data.paper.id,
          paperTitle: document.data.paper.title,
          page: selected.page,
          language,
          result,
          savedAt: new Date().toISOString(),
        });
    } catch (error) {
      if (
        generation !== assistanceGeneration.current ||
        controller.signal.aborted
      )
        return;
      setAssistance({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not get an explanation. Try again.",
      });
    }
  }
  return {
    document,
    page,
    pageContent,
    selection,
    assistance,
    language,
    difficulty,
    importArxiv,
    upload,
    chooseSelection,
    goToPage,
    changeLanguage,
    changeDifficulty,
    updateMetadata,
    explain,
  };
}
export type ReaderSession = ReturnType<typeof useReader>;
