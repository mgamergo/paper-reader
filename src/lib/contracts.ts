import { z } from "zod";

export const languages = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "te", label: "Telugu", native: "తెలుగు" },
  { id: "mr", label: "Marathi", native: "मराठी" },
  { id: "ta", label: "Tamil", native: "தமிழ்" },
] satisfies { id: string; label: string; native: string }[];
export const languageSchema = z.enum(["en", "hi", "te", "mr", "ta"]);
export type Language = z.infer<typeof languageSchema>;
export const difficultySchema = z.enum(["easy", "intermediate", "technical"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const metadataSchema = z.object({
  title: z.string().trim().min(1).max(500),
  abstract: z.string().max(6000),
});
export type PaperMetadata = z.infer<typeof metadataSchema>;
export type PaperSource =
  | { kind: "upload"; filename: string }
  | { kind: "arxiv"; id: string; url: string };
export type Paper = PaperMetadata & {
  id: string;
  source: PaperSource;
  bytes: Uint8Array;
};
export type Paragraph = {
  id: string;
  page: number;
  text: string;
  heading: boolean;
};
export type ExtractedPage = {
  page: number;
  paragraphs: Paragraph[];
  titleCandidate?: string;
};
export const selectionSchema = z.object({
  quote: z.string().trim().min(1).max(1000),
  paragraph: z.string().trim().min(1).max(12000),
  page: z.number().int().min(1).max(500),
});
export type ReaderSelection = z.infer<typeof selectionSchema>;
export const assistanceRequestSchema = z.object({
  kind: z.enum(["explain", "simplify"]),
  selection: selectionSchema,
  paper: metadataSchema,
  language: languageSchema,
  difficulty: difficultySchema,
});
export type AssistanceRequest = z.infer<typeof assistanceRequestSchema>;
export const definitionSchema = z.object({
  term: z.string().min(1).max(200),
  definition: z.string().min(1).max(2000),
  nativeTerm: z.string().max(500),
});
export type Definition = z.infer<typeof definitionSchema>;
export const generatedAssistanceSchema = z.object({
  english: z.string().min(1).max(16000),
  contextualMeaning: z.string().min(1).max(4000),
  field: z.string().min(1).max(200),
  native: z
    .object({
      language: languageSchema,
      explanation: z.string().min(1).max(16000),
    })
    .nullable(),
  definitions: z.array(definitionSchema).max(30),
});
export const assistanceResultSchema = generatedAssistanceSchema.extend({
  source: z.enum(["mock", "live"]),
  note: z.string().max(1000),
});
export type AssistanceResult = z.infer<typeof assistanceResultSchema>;
export type AsyncState<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: T }
  | { kind: "error"; message: string };
export const apiErrorSchema = z.object({ error: z.string() });
export const providerStatusSchema = z.object({
  mode: z.enum(["mock", "live", "error"]),
});
