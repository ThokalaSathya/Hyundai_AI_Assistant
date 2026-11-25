import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ai, getEmbedding } from "@/lib/gemini";

export const runtime = "nodejs";

const MODELS_TO_TRY = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

interface MatchedChunk {
  id: string;
  content: string;
  file_name: string;
  chunk_index: number;
  vehicle_model?: string | null;
  brochure_id?: string | null;
  user_id?: string | null;
  similarity?: number;
}

function shouldRetry(err: unknown): boolean {
  const errText = err instanceof Error ? err.message : JSON.stringify(err);
  return (
    errText.includes("fetch failed") ||
    errText.includes("ECONNRESET") ||
    errText.includes("ETIMEDOUT") ||
    errText.includes("timed out") ||
    errText.includes("503") ||
    errText.includes("UNAVAILABLE") ||
    errText.includes("429") ||
    errText.includes("high demand") ||
    errText.includes("RESOURCE_EXHAUSTED")
  );
}

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await withTimeout(fn());
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err) || i === attempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const vehicleModel =
      typeof body?.vehicleModel === "string" && body.vehicleModel.trim()
        ? body.vehicleModel.trim()
        : null;
    const brochureId =
      typeof body?.brochureId === "string" && body.brochureId.trim()
        ? body.brochureId.trim()
        : null;

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    const queryEmbedding = await withRetry(() => getEmbedding(message));
    const supabaseAdmin = createAdminClient();

    const { data: rawMatches, error: rpcError } = await withRetry(async () =>
      supabaseAdmin.rpc("match_hyundai_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: 15,
      })
    );

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    let filtered = ((rawMatches as MatchedChunk[]) || []).filter(
      (m) => m.user_id ? m.user_id === user.id : true
    );

    if (brochureId) {
      filtered = filtered.filter((m) => m.brochure_id === brochureId);
    } else if (vehicleModel && vehicleModel !== "All") {
      filtered = filtered.filter((m) => m.vehicle_model === vehicleModel);
    }

    const matches = filtered.slice(0, 5);

    const contextText =
      matches.length > 0
        ? matches
            .map(
              (m, idx) =>
                `[Source ${idx + 1}: ${m.file_name}${
                  m.vehicle_model ? ` (${m.vehicle_model})` : ""
                }, chunk ${m.chunk_index}]\n${m.content}`
            )
            .join("\n\n---\n\n")
        : "No matching manual excerpts were found.";

    const prompt = `You are a helpful Hyundai vehicle manual assistant.

Follow these rules strictly:
1. Check the Manual Excerpts first. If they answer the question, give a clear, accurate answer based on them and mention the source chunk(s).
2. If the Manual Excerpts do NOT cover the answer (or only partially cover it), state clearly that the specific detail is not found in the uploaded manual excerpts.
3. After stating that, you may provide general automotive knowledge to help the user, but explicitly label that part as "General automotive knowledge (not from the uploaded manual)".
4. Never fabricate exact vehicle specifications, capacities, warning light meanings, or procedures as coming from the manual if they are not in the excerpts.

Manual Excerpts:
${contextText}

User Question:
${message}`;

    let response;
    let lastError: unknown;

    for (const model of MODELS_TO_TRY) {
      try {
        response = await withRetry(
          () =>
            ai.models.generateContent({
              model,
              contents: prompt,
            }),
          2
        );
        lastError = null;
        break;
      } catch (err: unknown) {
        lastError = err;
        if (!shouldRetry(err)) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError ?? new Error("All models are temporarily unavailable.");
    }

    const answerText = response.text ?? "No response generated.";

    return NextResponse.json({
      answer: answerText,
      reply: answerText,
      sources: matches.map((m) => ({
        id: m.id,
        fileName: m.file_name,
        vehicleModel: m.vehicle_model ?? null,
        brochureId: m.brochure_id ?? null,
        chunkIndex: m.chunk_index,
        similarity: m.similarity ?? null,
      })),
    });
  } catch (err: unknown) {
    console.error("POST /api/chat error:", err);
    const errorMessage =
      err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}