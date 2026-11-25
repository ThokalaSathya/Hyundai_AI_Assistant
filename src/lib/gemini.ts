import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.hypot(...vec);
  if (!magnitude || !Number.isFinite(magnitude)) {
    return vec;
  }
  return vec.map((value) => value / magnitude);
}

export async function getEmbedding(
  text: string,
  taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY"
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 768,
      taskType,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Failed to generate embedding from Gemini.");
  }

  return normalizeVector(values);
}

export async function getBatchEmbeddings(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: batch,
      config: {
        outputDimensionality: 768,
        taskType,
      },
    });

    const vectors = response.embeddings?.map((e) => e.values ?? []);
    if (!vectors || vectors.length !== batch.length) {
      throw new Error("Failed to generate batch embeddings from Gemini.");
    }

    allEmbeddings.push(...vectors.map((vec) => normalizeVector(vec)));
  }

  return allEmbeddings;
}