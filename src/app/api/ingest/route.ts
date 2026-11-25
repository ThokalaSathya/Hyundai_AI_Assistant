import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/chunker";
import { getBatchEmbeddings } from "@/lib/gemini";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return (result?.text || "").trim();
  } finally {
    await parser.destroy();
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let brochureId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const vehicleModel =
      (formData.get("vehicleModel") as string | null)?.trim() || "General";

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const { data: brochure, error: brochureErr } = await supabaseAdmin
      .from("brochures")
      .insert({
        user_id: user.id,
        file_name: file.name,
        vehicle_model: vehicleModel,
        status: "processing",
      })
      .select("id")
      .single();

    if (brochureErr || !brochure) {
      throw new Error(
        brochureErr?.message || "Failed to create brochure record"
      );
    }

    brochureId = brochure.id;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await extractPdfText(buffer);

    if (!extractedText) {
      throw new Error("Could not extract text from the uploaded PDF.");
    }

    const chunks = chunkText(extractedText, 2000, 200);
    if (chunks.length === 0) {
      throw new Error("No text chunks generated from the PDF.");
    }

    const embeddings = await getBatchEmbeddings(chunks);

    const rows = chunks.map((content, i) => ({
      brochure_id: brochureId,
      user_id: user.id,
      vehicle_model: vehicleModel,
      file_name: file.name,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }));

    const { error: insertChunksErr } = await supabaseAdmin
      .from("hyundai_chunks")
      .insert(rows);

    if (insertChunksErr) {
      throw new Error(insertChunksErr.message);
    }

    const { error: updateBrochureErr } = await supabaseAdmin
      .from("brochures")
      .update({
        status: "indexed",
        chunk_count: rows.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", brochureId)
      .eq("user_id", user.id);

    if (updateBrochureErr) {
      throw new Error(updateBrochureErr.message);
    }

    return NextResponse.json({
      success: true,
      brochureId,
      fileName: file.name,
      vehicleModel,
      chunkCount: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ingestion failed";

    if (brochureId) {
      await supabaseAdmin
        .from("brochures")
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brochureId);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}