"use client";
import { useId } from "react";
import type { Definition } from "@/lib/contracts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function DefinedText({
  text,
  definitions,
}: {
  text: string;
  definitions: Definition[];
}) {
  const id = useId();
  const byTerm = new Map(
    definitions.map((definition) => [
      definition.term.toLowerCase(),
      definition,
    ]),
  );
  const pattern = [...byTerm.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  if (!pattern) return <>{text}</>;
  return (
    <>
      {text
        .split(new RegExp(`(\\b(?:${pattern})\\b)`, "gi"))
        .map((part, index) => {
          const definition = byTerm.get(part.toLowerCase());
          if (!definition) return part;
          const definitionId = `${id}-${index}`;
          return (
            <Popover key={definitionId}>
              <PopoverTrigger asChild>
                <button
                  className="defined-term"
                  aria-label={`Define ${part}`}
                  aria-describedby={definitionId}
                >
                  {part}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <strong>{definition.term}</strong>
                <p id={definitionId}>{definition.definition}</p>
                {definition.nativeTerm !== definition.term && (
                  <p className="native-term">{definition.nativeTerm}</p>
                )}
              </PopoverContent>
            </Popover>
          );
        })}
    </>
  );
}
