"use client";
import { useState } from "react";
import { ArrowRight, BookOpen, Trash2, X } from "lucide-react";
import { languages } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useGlossary } from "./use-glossary";
type Glossary = ReturnType<typeof useGlossary>;
export function GlossaryPanel({
  glossary,
  onClose,
}: {
  glossary: Glossary;
  onClose: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const card = glossary.entries[index % Math.max(1, glossary.entries.length)];
  return (
    <>
      <aside className="glossary-panel" aria-label="Saved glossary">
        <div className="panel-heading">
          <h2>
            My glossary <span>{glossary.entries.length}</span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close glossary"
          >
            <X />
          </Button>
        </div>
        <p className="muted panel-description">
          Small discoveries, kept for later.
        </p>
        {glossary.storage.kind === "error" && (
          <div role="alert" className="storage-error">
            <p>{glossary.storage.message}</p>
            <Button size="sm" variant="outline" onClick={glossary.reset}>
              Reset storage and save session
            </Button>
          </div>
        )}
        {glossary.entries.length > 0 ? (
          <>
            <Button
              variant="outline"
              className="review-button"
              onClick={() => {
                setIndex(0);
                setRevealed(false);
                setReviewOpen(true);
              }}
            >
              <BookOpen />
              Review flashcards
              <ArrowRight />
            </Button>
            <div className="glossary-list">
              {glossary.entries.map((entry) => (
                <article key={entry.id} className="glossary-entry">
                  <div className="glossary-term-row">
                    <button
                      className="glossary-term"
                      aria-expanded={expanded === entry.id}
                      onClick={() =>
                        setExpanded(expanded === entry.id ? null : entry.id)
                      }
                    >
                      {entry.term}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${entry.term}`}
                      onClick={() => glossary.remove(entry.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="entry-language">
                    {entry.language === "en"
                      ? "English"
                      : `English + ${languages.find((language) => language.id === entry.language)?.label}`}
                    <span>
                      {entry.result.source === "mock" ? "Demo" : "AI"}
                    </span>
                  </p>
                  <p className="glossary-definition">{entry.result.english}</p>
                  {entry.result.native && (
                    <p
                      lang={entry.result.native.language}
                      className="glossary-native"
                    >
                      {entry.result.native.explanation}
                    </p>
                  )}
                  <p className="entry-provenance">
                    {entry.paperTitle}
                    <br />
                    Page {entry.page}
                  </p>
                  {expanded === entry.id && (
                    <blockquote>{entry.context}</blockquote>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="glossary-empty">
            <BookOpen size={28} strokeWidth={1.3} />
            <h3>A little less unfamiliar.</h3>
            <p>
              Select a term and choose Explain selection. Your discoveries are
              saved here automatically.
            </p>
            <span className="fine-print">Stored only in this browser</span>
          </div>
        )}
      </aside>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="flashcard-dialog">
          <DialogTitle className="dialog-title">
            A moment to remember
          </DialogTitle>
          <DialogDescription className="muted">
            Recall the meaning, then reveal the explanation.
          </DialogDescription>
          {card ? (
            <div className="flashcard">
              <p className="fine-print">
                Card {(index % glossary.entries.length) + 1} of{" "}
                {glossary.entries.length}
              </p>
              <h3>{card.term}</h3>
              <p className="flashcard-context">“{card.context}”</p>
              <p className="fine-print">
                {card.paperTitle} · page {card.page}
              </p>
              {revealed ? (
                <div
                  data-testid="flashcard-answer"
                  className="flashcard-answer"
                >
                  <p>{card.result.english}</p>
                  {card.result.native && (
                    <p lang={card.result.native.language}>
                      {card.result.native.explanation}
                    </p>
                  )}
                  <Button
                    onClick={() => {
                      setIndex((value) => value + 1);
                      setRevealed(false);
                    }}
                  >
                    Next card
                    <ArrowRight />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setRevealed(true)}>
                  Reveal meaning
                </Button>
              )}
            </div>
          ) : (
            <p>No terms to review yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
