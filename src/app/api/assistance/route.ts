import {
  assistanceRequestSchema,
  assistanceResultSchema,
} from "@/lib/contracts";
import { assist, providerMode } from "@/lib/assistance/provider";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(
    { mode: providerMode() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 28000)
      return Response.json(
        { error: "The selection is too long. Choose a shorter paragraph." },
        { status: 413 },
      );
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Send valid JSON." }, { status: 400 });
    }
    const parsed = assistanceRequestSchema.safeParse(value);
    if (!parsed.success)
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid assistance request.",
        },
        { status: 400 },
      );
    try {
      const result = await assist(
        parsed.data,
        AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
      );
      return Response.json(assistanceResultSchema.parse(result), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return Response.json(
        {
          error:
            "The AI provider could not complete this request. Check the server's provider, model, and credentials, then try again. No demo response was substituted.",
        },
        { status: 502 },
      );
    }
  } catch {
    return Response.json(
      { error: "The request could not be read." },
      { status: 400 },
    );
  }
}
