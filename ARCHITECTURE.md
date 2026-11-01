# Reader architecture

Margin helps non-native English readers understand research terminology in context. The prototype uses one browser-owned reading session and stateless Next.js routes.

## Contracts and ownership

- A paper holds its source, title, abstract, and PDF bytes or same-origin URL. Uploads stay in memory.
- A selection holds its quote, surrounding paragraph, and page. PDF geometry stays inside the PDF component.
- An assistance request holds the selection, paper metadata, language, and either explanation or simplification with a difficulty level.
- An assistance result holds English, an optional native-language explanation, technical definitions, and a live or mock source label.
- A glossary entry holds the term, explanation, context sentence, paper provenance, and language. A versioned localStorage module validates persisted values.

The provider module alone imports the Vercel AI SDK and reads server credentials. Missing credentials produce labeled, curated demo output. Provider errors remain visible errors.

## Synthesis decision

Two independent sketches converged on a feature-oriented client session with narrow import and assistance routes. This replaces a server document store and processing jobs, whose lifecycle would add complexity without improving the prototype. Both sketches contributed cancellation and generation checks, bounded arXiv downloads, schema validation, editable metadata, and local glossary persistence. No cross-judge ran because the configured pool shares one model family.

## Visual direction

Use paper white (#ffffff), cool canvas (#f4f6fa), ink (#202a3b), muted slate (#6c778a), blue (#3465dc), and pale blue (#edf3ff). Use a clear sans-serif for controls and a readable serif for extracted paragraphs. Keep the original PDF available with its selectable text layer. On desktop, place navigation left, reading center, and glossary right. On mobile, use one reading column and dismissible panels.

## Throughput checkpoint

- Blocking first steps: establish framework and shared schemas before feature wiring.
- Independent workstreams: one isolated feature implementation; parent owns final browser verification and review.
- Shared mutable state: one reader session owns document and request transitions; glossary persistence has one module.
- Smallest safe decomposition: one feature owner keeps PDF selection and contextual assistance consistent.

## Verification contract

Run formatting, lint, types, unit tests, and a production build. Drive the real app with arXiv 1706.03762, select text, request bilingual help, simplify a paragraph, inspect linked definitions, review glossary flashcards, and reload persistence. Record console, page, failed-request, and HTTP errors. Inspect desktop, tablet, and mobile screenshots. Stop test-owned processes.
