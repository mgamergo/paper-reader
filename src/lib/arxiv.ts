import { z } from "zod";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
const hosts = new Set(["arxiv.org", "www.arxiv.org", "export.arxiv.org"]);

export function parseArxivId(input: string): string {
  let id = input.trim().replace(/^arxiv:\s*/i, "");
  if (id.includes("://")) {
    const url = new URL(id);
    if (
      url.protocol !== "https:" ||
      !hosts.has(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "Use an HTTPS arxiv.org abstract or PDF URL, without query parameters.",
      );
    }
    const match = url.pathname.match(/^\/(?:abs|pdf)\/(.+)$/);
    if (!match) throw new Error("Use an arXiv abstract or PDF link.");
    id = match[1];
  }
  id = id.replace(/\.pdf$/, "");
  const modern = id.match(/^(\d{2})(\d{2})\.(\d{4,5})(?:v([1-9]\d{0,2}))?$/);
  const old = id.match(
    /^[a-z][a-z-]*(?:\.[A-Z]{2})?\/(\d{2})(\d{2})(\d{3})(?:v([1-9]\d{0,2}))?$/,
  );
  const match = modern ?? old;
  if (!match)
    throw new Error(
      "Enter a valid arXiv ID, such as 1706.03762 or hep-th/9901001.",
    );
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12)
    throw new Error("The arXiv ID has an invalid month.");
  if (
    modern &&
    (year > new Date().getUTCFullYear() % 100 ||
      year < 7 ||
      (year === 7 && month < 4) ||
      modern[3].length !== (year < 15 ? 4 : 5))
  ) {
    throw new Error("The arXiv ID has an invalid date or sequence length.");
  }
  if (
    old &&
    !((year >= 91 && year <= 99) || year <= 6 || (year === 7 && month <= 3))
  ) {
    throw new Error("Old-style arXiv IDs must date from 1991 to March 2007.");
  }
  if (/^0+$/.test(match[3]))
    throw new Error("The arXiv sequence number must be positive.");
  return id;
}
export const arxivInputSchema = z
  .string()
  .min(1)
  .max(300)
  .transform((value, ctx) => {
    try {
      return parseArxivId(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid arXiv ID.",
      });
      return z.NEVER;
    }
  });

export function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder("ascii")
    .decode(bytes.subarray(0, 1024))
    .includes("%PDF-");
}

export async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const length = Number(response.headers.get("content-length"));
  if (length > maxBytes) throw new Error("This PDF exceeds the 20 MB limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("arXiv returned an empty response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("This PDF exceeds the 20 MB limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function fetchArxivPdf(
  id: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  let url = new URL(`https://arxiv.org/pdf/${id}`);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetch(url, {
      signal,
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept: "application/pdf",
        "User-Agent": "MarginReaderPrototype/0.1 (research reading tool)",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("arXiv returned an invalid redirect.");
      url = new URL(location, url);
      if (
        url.protocol !== "https:" ||
        !hosts.has(url.hostname) ||
        url.port ||
        url.username ||
        url.password ||
        !url.pathname.startsWith("/pdf/")
      ) {
        throw new Error("arXiv redirected outside the allowed PDF hosts.");
      }
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `arXiv returned HTTP ${response.status}. Check the ID or upload the PDF.`,
      );
    }
    const bytes = await readBoundedBody(response, MAX_PDF_BYTES);
    if (!isPdf(bytes))
      throw new Error(
        "arXiv did not return a PDF. Try downloading it and uploading the file.",
      );
    return bytes;
  }
  throw new Error("arXiv returned too many redirects.");
}
