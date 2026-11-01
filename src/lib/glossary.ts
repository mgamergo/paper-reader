import { z } from "zod";
import { assistanceResultSchema, languageSchema } from "./contracts";

export const GLOSSARY_KEY = "margin.glossary.v1";
export const glossaryEntrySchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1).max(1000),
  context: z.string().min(1).max(12000),
  paperId: z.string().min(1),
  paperTitle: z.string().min(1).max(500),
  page: z.number().int().positive(),
  language: languageSchema,
  result: assistanceResultSchema,
  savedAt: z.string().datetime(),
});
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
const storedSchema = z.object({
  version: z.literal(1),
  entries: z.array(glossaryEntrySchema).max(500),
});
export function decodeGlossary(raw: string | null): GlossaryEntry[] {
  return raw === null ? [] : storedSchema.parse(JSON.parse(raw)).entries;
}
export function encodeGlossary(entries: GlossaryEntry[]): string {
  return JSON.stringify(storedSchema.parse({ version: 1, entries }));
}
export function glossaryIdentity(
  input: Pick<GlossaryEntry, "term" | "paperId" | "language">,
): string {
  return `${input.paperId}:${input.language}:${input.term.trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}
export function saveTerm(
  entries: GlossaryEntry[],
  entry: GlossaryEntry,
): GlossaryEntry[] {
  const identity = glossaryIdentity(entry);
  const existing = entries.find((item) => glossaryIdentity(item) === identity);
  const updated = existing ? { ...entry, id: existing.id } : entry;
  return [
    updated,
    ...entries.filter((item) => glossaryIdentity(item) !== identity),
  ].slice(0, 500);
}
export function contextSentence(paragraph: string, term: string): string {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph];
  return (
    sentences.find((sentence) =>
      sentence.toLowerCase().includes(term.toLowerCase()),
    ) ?? paragraph
  ).trim();
}
