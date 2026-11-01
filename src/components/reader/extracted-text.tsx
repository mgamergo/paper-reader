"use client";
import type { Paragraph } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
export function ExtractedText({
  paragraphs,
  onAction,
}: {
  paragraphs: Paragraph[];
  onAction: (
    paragraph: Paragraph,
    element: HTMLElement,
    action: "explain" | "simplify",
  ) => void;
}) {
  const abstractIndex =
    paragraphs[0]?.page === 1
      ? paragraphs.findIndex((paragraph) => /^Abstract\b/i.test(paragraph.text))
      : -1;
  const frontmatter =
    abstractIndex > 0 ? paragraphs.slice(0, abstractIndex) : [];
  const body = abstractIndex > 0 ? paragraphs.slice(abstractIndex) : paragraphs;
  const notesIndex =
    abstractIndex > 0
      ? body.findIndex(
          (paragraph, index) => index > 0 && /^[∗*†‡]/.test(paragraph.text),
        )
      : -1;
  const main = notesIndex > 0 ? body.slice(0, notesIndex) : body;
  const notes = notesIndex > 0 ? body.slice(notesIndex) : [];
  function renderParagraph(paragraph: Paragraph) {
    return (
      <section
        key={paragraph.id}
        className={`paragraph-block ${paragraph.heading ? "is-heading" : ""}`}
      >
        <p
          data-paragraph={paragraph.text}
          data-paragraph-id={paragraph.id}
          tabIndex={0}
        >
          {paragraph.text}
        </p>
        {!paragraph.heading && paragraph.text.length > 60 && (
          <div className="paragraph-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) =>
                onAction(paragraph, event.currentTarget, "explain")
              }
            >
              Explain selection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) =>
                onAction(paragraph, event.currentTarget, "simplify")
              }
            >
              Simplify paragraph
            </Button>
          </div>
        )}
      </section>
    );
  }
  return (
    <div className="extracted-content" data-testid="extracted-content">
      {frontmatter.length > 0 && (
        <details className="page-details">
          <summary>Title page details and attribution</summary>
          {frontmatter.map(renderParagraph)}
        </details>
      )}
      {main.map(renderParagraph)}
      {notes.length > 0 && (
        <details className="page-details">
          <summary>Page notes and contributions</summary>
          {notes.map(renderParagraph)}
        </details>
      )}
    </div>
  );
}
