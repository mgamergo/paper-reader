"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Languages,
  List,
  LoaderCircle,
  PanelRight,
  X,
} from "lucide-react";
import { languageSchema, languages, type Paragraph } from "@/lib/contracts";
import { paragraphForQuote } from "@/lib/pdf/paragraphs";
import { Button } from "@/components/ui/button";
import { OpenPaperDialog } from "./open-paper-dialog";
import { MetadataDialog } from "./metadata-dialog";
import { SelectionHelp } from "./selection-help";
import { GlossaryPanel } from "./glossary-panel";
import { PdfPage } from "./pdf-page";
import { ExtractedText } from "./extracted-text";
import { useGlossary } from "./use-glossary";
import { useReader } from "./use-reader";

export function ReaderWorkspace({
  providerMode,
}: {
  providerMode: "mock" | "live" | "error";
}) {
  const glossary = useGlossary();
  const reader = useReader(glossary.add);
  const [view, setView] = useState<"text" | "pdf">("text");
  const [glossaryOpen, setGlossaryOpen] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 100, left: 24 });
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    function adaptPanels() {
      setGlossaryOpen(window.matchMedia("(min-width: 1001px)").matches);
    }
    const query = window.matchMedia("(min-width: 1001px)");
    adaptPanels();
    query.addEventListener("change", adaptPanels);
    return () => query.removeEventListener("change", adaptPanels);
  }, []);
  const document =
    reader.document.kind === "success" ? reader.document.data : null;
  const paragraphs =
    reader.pageContent.kind === "success"
      ? reader.pageContent.data.paragraphs
      : [];
  function captureSelection(event: { target: EventTarget | null }) {
    const selection = window.getSelection();
    const root = article.current;
    if (event.target instanceof Node && !root?.contains(event.target)) return;
    if (
      !selection ||
      !root ||
      selection.isCollapsed ||
      !root.contains(selection.anchorNode) ||
      !root.contains(selection.focusNode)
    )
      return;
    const quote = selection.toString().trim();
    if (!quote || quote.length > 1000) return;
    const target =
      selection.anchorNode?.parentElement?.closest<HTMLElement>(
        "[data-paragraph]",
      );
    const paragraph =
      target?.dataset.paragraph ?? paragraphForQuote(paragraphs, quote);
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const bounds = root.getBoundingClientRect();
    setAnchor({
      top:
        Math.max(92, Math.min(rect.bottom, window.innerHeight - 100)) -
        bounds.top,
      left: Math.max(12, Math.min(rect.left - bounds.left, bounds.width - 40)),
    });
    reader.chooseSelection({
      quote,
      paragraph: (paragraph === quote && view === "pdf"
        ? paragraphs.map((item) => item.text).join("\n\n") || quote
        : paragraph
      ).slice(0, 12000),
      page: reader.page,
    });
  }
  function selectParagraph(
    paragraph: Paragraph,
    element: HTMLElement,
    action: "explain" | "simplify",
  ) {
    const root = article.current;
    if (root) {
      const bounds = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      setAnchor({ top: rect.bottom - bounds.top, left: 24 });
    }
    const selected = {
      quote: paragraph.text.slice(0, 1000),
      paragraph: paragraph.text.slice(0, 12000),
      page: paragraph.page,
    };
    reader.chooseSelection(selected);
    void reader.explain(action, selected);
  }
  function selectionKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Shift" || event.shiftKey) captureSelection(event);
  }
  return (
    <div
      className={`reader-app ${glossaryOpen ? "with-glossary" : "without-glossary"}`}
    >
      <a className="skip-link" href="#reading-desk">
        Skip to reading desk
      </a>
      <header className="app-header">
        <Link className="brand" href="/" aria-label="Margin home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          Margin
          <span className="brand-caption">A little more understanding.</span>
        </Link>
        <div className="header-controls">
          <span className={`mode-status ${providerMode}`}>
            <i />
            {providerMode === "mock"
              ? "Demo mode"
              : providerMode === "live"
                ? "Live AI"
                : "Provider setup needed"}
          </span>
          <label className="language-picker">
            <Languages size={16} />
            <span className="sr-only">Native language</span>
            <select
              aria-label="Native language"
              value={reader.language}
              onChange={(event) => {
                const parsed = languageSchema.safeParse(event.target.value);
                if (parsed.success) reader.changeLanguage(parsed.data);
              }}
            >
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                  {language.id !== "en" ? ` · ${language.native}` : ""}
                </option>
              ))}
            </select>
          </label>
          <OpenPaperDialog reader={reader} />
          <Button
            className="glossary-toggle"
            variant="ghost"
            size="icon"
            aria-label={glossaryOpen ? "Hide glossary" : "Show glossary"}
            aria-expanded={glossaryOpen}
            onClick={() => setGlossaryOpen(!glossaryOpen)}
          >
            <PanelRight />
          </Button>
        </div>
      </header>
      <div className="desk-layout">
        <aside
          className={`library-sidebar ${navigationOpen ? "is-open" : ""}`}
          aria-label="Paper navigation"
        >
          <div className="sidebar-heading">
            <span>Your workspace</span>
            <Button
              className="mobile-close"
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              onClick={() => setNavigationOpen(false)}
            >
              <X />
            </Button>
          </div>
          <div className="library-label">
            <FolderOpen size={17} />
            Library
          </div>
          {document ? (
            <>
              <button
                className="current-paper"
                onClick={() => {
                  reader.goToPage(1);
                  setNavigationOpen(false);
                }}
              >
                <FileText size={16} />
                <span>
                  {document.paper.title}
                  <small>
                    {document.pdf.numPages} pages ·{" "}
                    {document.paper.source.kind === "arxiv"
                      ? "arXiv"
                      : "Local PDF"}
                  </small>
                </span>
              </button>
              <div className="outline-heading">In this paper</div>
              <nav className="page-outline" aria-label="Paper pages">
                {Array.from(
                  { length: document.pdf.numPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    key={page}
                    aria-current={reader.page === page ? "page" : undefined}
                    onClick={() => {
                      reader.goToPage(page);
                      setNavigationOpen(false);
                    }}
                  >
                    <span>Page {page}</span>
                    {reader.page === page && <span className="current-dot" />}
                  </button>
                ))}
              </nav>
            </>
          ) : (
            <div className="sidebar-empty">
              <p>Your next paper starts here.</p>
              <span>Open a PDF to make it your own.</span>
            </div>
          )}
          <div className="sidebar-footer">
            <BookOpen size={18} />
            <p>
              Read at your own pace.
              <br />
              <span>Understanding takes a margin.</span>
            </p>
          </div>
        </aside>
        <main id="reading-desk" className="reading-desk">
          <div className="desk-topline">
            <Button
              className="navigation-toggle"
              variant="ghost"
              size="sm"
              onClick={() => setNavigationOpen(!navigationOpen)}
              aria-expanded={navigationOpen}
            >
              <List />
              Pages
            </Button>
            <span>
              {document ? "Your reading desk" : "A space for close reading"}
            </span>
            <span className="session-label">
              {providerMode === "mock"
                ? "Demo mode · Private session"
                : providerMode === "live"
                  ? "Live AI · Private session"
                  : "Provider setup needed"}
            </span>
          </div>
          {reader.document.kind === "loading" ? (
            <div className="loading-paper" role="status">
              <LoaderCircle className="spin" size={28} />
              <h1>Opening your paper…</h1>
              <p>Downloading the PDF and preparing its text.</p>
            </div>
          ) : !document ? (
            <div className="empty-desk">
              {reader.document.kind === "error" && (
                <p role="alert" className="error-message import-error">
                  {reader.document.message}
                </p>
              )}
              <div className="empty-paper">
                <div className="paper-glyph" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <h1>
                  Make room for
                  <br />
                  understanding.
                </h1>
                <p className="empty-intro">
                  Read the paper. Pause on a word.
                  <br />
                  Find its meaning in your language.
                </p>
                <div className="demo-paper">
                  <div className="demo-paper-top">
                    <FileText size={20} />
                    <span>A paper to start with</span>
                  </div>
                  <h2>Attention Is All You Need</h2>
                  <p>
                    Vaswani et al. · 2017
                    <br />
                    The paper that introduced the Transformer.
                  </p>
                  <Button onClick={() => void reader.importArxiv("1706.03762")}>
                    Read Attention Is All You Need
                    <ArrowRight />
                  </Button>
                  <a
                    href="https://arxiv.org/abs/1706.03762"
                    target="_blank"
                    rel="noreferrer"
                  >
                    arXiv:1706.03762 · Original PDF
                  </a>
                </div>
                <p className="empty-footnote">
                  Or use Open paper to upload a PDF or import an arXiv link.
                </p>
              </div>
              <div className="desk-hint">
                <span>English, with a familiar voice beside it.</span>
                <span>Hindi · Telugu · Marathi · Tamil</span>
              </div>
            </div>
          ) : (
            <>
              <div className="reader-toolbar">
                <div
                  className="view-switch"
                  role="group"
                  aria-label="Reading view"
                >
                  <Button
                    variant={view === "text" ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={view === "text"}
                    onClick={() => {
                      setView("text");
                      reader.chooseSelection(null);
                    }}
                  >
                    <BookOpen />
                    Text
                  </Button>
                  <Button
                    variant={view === "pdf" ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={view === "pdf"}
                    onClick={() => {
                      setView("pdf");
                      reader.chooseSelection(null);
                    }}
                  >
                    <FileText />
                    PDF
                  </Button>
                </div>
                <div className="page-controls">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={reader.page <= 1}
                    onClick={() => reader.goToPage(reader.page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <label>
                    <span className="sr-only">Page</span>
                    <select
                      aria-label="Page"
                      value={reader.page}
                      onChange={(event) =>
                        reader.goToPage(Number(event.target.value))
                      }
                    >
                      {Array.from(
                        { length: document.pdf.numPages },
                        (_, index) => (
                          <option key={index + 1} value={index + 1}>
                            {index + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <span>of {document.pdf.numPages}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={reader.page >= document.pdf.numPages}
                    onClick={() => reader.goToPage(reader.page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <article
                ref={article}
                className={`document-sheet ${view === "pdf" ? "pdf-sheet" : ""}`}
                aria-label="Paper reading area"
                onMouseUp={captureSelection}
                onKeyUp={selectionKeyboard}
              >
                <div className="paper-heading">
                  <div className="paper-source">
                    <span>
                      {document.paper.source.kind === "arxiv"
                        ? `arXiv ${document.paper.source.id}`
                        : document.paper.source.filename}
                    </span>
                    <MetadataDialog
                      metadata={document.paper}
                      onSave={reader.updateMetadata}
                    />
                  </div>
                  <h1>{document.paper.title}</h1>
                  <p className="reading-instruction">
                    Select a word or phrase for help, or use a paragraph&apos;s
                    actions.
                  </p>
                </div>
                {view === "pdf" ? (
                  <PdfPage pdf={document.pdf} page={reader.page} />
                ) : reader.pageContent.kind === "loading" ? (
                  <p className="muted" role="status">
                    Preparing this page…
                  </p>
                ) : reader.pageContent.kind === "error" ? (
                  <p role="alert" className="error-message">
                    {reader.pageContent.message}
                  </p>
                ) : paragraphs.length === 0 ? (
                  <p className="no-text">
                    This page has no extractable text. It may be a scanned PDF.
                    Try PDF view. OCR is not included.
                  </p>
                ) : (
                  <ExtractedText
                    paragraphs={paragraphs}
                    onAction={selectParagraph}
                  />
                )}
                <SelectionHelp reader={reader} anchor={anchor} />
                <footer className="paper-footer">
                  <span>Page {reader.page}</span>
                  <span>
                    {view === "text"
                      ? "Text extracted from your PDF"
                      : "Original PDF · selectable text"}
                  </span>
                </footer>
              </article>
              <div className="bottom-page-controls">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reader.page <= 1}
                  onClick={() => reader.goToPage(reader.page - 1)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span>
                  Page {reader.page} of {document.pdf.numPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reader.page >= document.pdf.numPages}
                  onClick={() => {
                    reader.goToPage(reader.page + 1);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  Next page
                  <ChevronRight />
                </Button>
              </div>
            </>
          )}
        </main>
        {glossaryOpen && (
          <GlossaryPanel
            glossary={glossary}
            onClose={() => setGlossaryOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
