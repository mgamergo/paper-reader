"use client";
import { X, BookOpen, Languages, LoaderCircle } from "lucide-react";
import { languages, type Difficulty } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { DefinedText } from "./defined-text";
import type { ReaderSession } from "./use-reader";
const levels: Difficulty[] = ["easy", "intermediate", "technical"];
export function SelectionHelp({
  reader,
  anchor,
}: {
  reader: ReaderSession;
  anchor: { top: number; left: number };
}) {
  const { selection, assistance } = reader;
  const language = languages.find((item) => item.id === reader.language);
  if (!selection) return null;
  return (
    <Popover
      open={selection !== null}
      onOpenChange={(open) => {
        if (!open) reader.chooseSelection(null);
      }}
    >
      <PopoverAnchor asChild>
        <span
          className="selection-anchor"
          style={{
            top: anchor.top,
            left: `clamp(12px, ${anchor.left}px, calc(100% - 24px))`,
          }}
        />
      </PopoverAnchor>
      {selection && (
        <PopoverContent
          className="selection-help"
          side="bottom"
          align="start"
          sideOffset={12}
          sticky="always"
          collisionPadding={{ top: 88, bottom: 16, left: 16, right: 16 }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          aria-label="Selection help"
        >
          <div className="help-heading">
            <div>
              <span className="fine-print">
                Selected on page {selection.page}
              </span>
              <h3>{selection.quote}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close selection help"
              onClick={() => reader.chooseSelection(null)}
            >
              <X />
            </Button>
          </div>
          <div className="help-actions">
            <Button
              onClick={() => void reader.explain("explain")}
              disabled={
                assistance.kind === "loading" ||
                !selection.quote.trim() ||
                !selection.paragraph.trim()
              }
            >
              <BookOpen />
              Explain selection
            </Button>
            <Button
              variant="outline"
              onClick={() => void reader.explain("simplify")}
              disabled={
                assistance.kind === "loading" ||
                !selection.quote.trim() ||
                !selection.paragraph.trim()
              }
            >
              Simplify paragraph
            </Button>
          </div>
          <details className="context-editor">
            <summary>Inspect or correct context</summary>
            <label htmlFor="selected-quote">Selected term</label>
            <input
              id="selected-quote"
              value={selection.quote}
              maxLength={1000}
              onChange={(event) =>
                reader.chooseSelection({
                  ...selection,
                  quote: event.target.value,
                })
              }
            />
            <label htmlFor="selection-context">Surrounding paragraph</label>
            <textarea
              id="selection-context"
              value={selection.paragraph}
              rows={5}
              maxLength={12000}
              onChange={(event) =>
                reader.chooseSelection({
                  ...selection,
                  paragraph: event.target.value,
                })
              }
            />
            <p className="fine-print">
              The paragraph, selected term, title, and abstract are used for
              help.
            </p>
          </details>
          <div className="difficulty">
            <div className="difficulty-label">
              <label>Reading level</label>
              <span>{reader.difficulty}</span>
            </div>
            <Slider
              valueLabel={reader.difficulty}
              min={0}
              max={2}
              step={1}
              value={[levels.indexOf(reader.difficulty)]}
              onValueChange={([value]) => {
                const level = levels[value];
                if (level) reader.changeDifficulty(level);
              }}
            />
            <div className="slider-labels">
              <span>Easy</span>
              <span>Intermediate</span>
              <span>Technical</span>
            </div>
          </div>
          {assistance.kind === "loading" && (
            <p role="status" className="loading-inline">
              <LoaderCircle className="spin" size={16} />
              Reading your context…
            </p>
          )}
          {assistance.kind === "error" && (
            <p role="alert" className="error-message">
              {assistance.message}
            </p>
          )}
          {assistance.kind === "success" && (
            <div className="assistance-result" data-testid="assistance-result">
              <div className="result-meta">
                <span className="source-badge">
                  {assistance.data.result.source === "mock"
                    ? "Demo response"
                    : "Live AI"}
                </span>
                <span>{assistance.data.result.field}</span>
              </div>
              {assistance.data.request.kind === "simplify" ? (
                <>
                  <div className="rewrite-section">
                    <h4>Original paragraph</h4>
                    <p className="original-paragraph">
                      {assistance.data.request.selection.paragraph}
                    </p>
                  </div>
                  <div className="rewrite-section">
                    <h4>Simplified · {assistance.data.request.difficulty}</h4>
                    <p className="simplified-paragraph">
                      <DefinedText
                        text={assistance.data.result.english}
                        definitions={assistance.data.result.definitions}
                      />
                    </p>
                  </div>
                </>
              ) : (
                <div className="bilingual-result">
                  <section>
                    <h4>In English</h4>
                    <p>{assistance.data.result.english}</p>
                  </section>
                  {assistance.data.result.native && (
                    <section lang={assistance.data.result.native.language}>
                      <h4>
                        <Languages size={14} />
                        {language?.native}
                      </h4>
                      <p>{assistance.data.result.native.explanation}</p>
                    </section>
                  )}
                </div>
              )}
              <details className="meaning-details">
                <summary>Meaning in this passage</summary>
                <p>{assistance.data.result.contextualMeaning}</p>
              </details>
              {assistance.data.request.kind === "simplify" &&
                assistance.data.result.native && (
                  <section
                    lang={assistance.data.result.native.language}
                    className="native-rewrite"
                  >
                    <h4>{language?.native}</h4>
                    <p>{assistance.data.result.native.explanation}</p>
                  </section>
                )}
              {assistance.data.result.definitions.length > 0 && (
                <details className="meaning-details">
                  <summary>
                    Technical definitions (
                    {assistance.data.result.definitions.length})
                  </summary>
                  <dl>
                    {assistance.data.result.definitions.map((definition) => (
                      <div key={definition.term}>
                        <dt>
                          {definition.term} <span>{definition.nativeTerm}</span>
                        </dt>
                        <dd>{definition.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              <p className="demo-note">{assistance.data.result.note}</p>
              {assistance.data.request.kind === "explain" && (
                <p className="saved-note" role="status">
                  Added to your glossary.
                </p>
              )}
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
