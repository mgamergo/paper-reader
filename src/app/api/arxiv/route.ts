import { arxivInputSchema, fetchArxivPdf } from "@/lib/arxiv";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const parsed = arxivInputSchema.safeParse(
    new URL(request.url).searchParams.get("id"),
  );
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Enter an arXiv ID." },
      { status: 400 },
    );
  try {
    const bytes = await fetchArxivPdf(
      parsed.data,
      AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "arXiv took too long. Try again or upload the PDF."
        : error instanceof Error
          ? error.message
          : "Could not import the PDF.";
    return Response.json({ error: message }, { status: 502 });
  }
}
