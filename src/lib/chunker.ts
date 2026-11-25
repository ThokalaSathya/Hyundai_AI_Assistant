export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end).trim());
    if (end === cleaned.length) break;
    start += chunkSize - overlap;
  }

  return chunks.filter(Boolean);
}