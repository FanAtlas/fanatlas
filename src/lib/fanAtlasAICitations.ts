import type { TravelCitation } from "./fanAtlasAIContracts";

export function validateCitationUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function normalizeTravelCitations(citations: readonly TravelCitation[], retrievedAt: string): TravelCitation[] {
  const seen = new Set<string>();
  return citations.flatMap((citation, index) => {
    const title = citation.title.trim();
    const source = citation.source.trim();
    if (!title || !source) return [];
    const url = validateCitationUrl(citation.url);
    const id = citation.id.trim().replace(/\s+/g, "-") || `citation-${index + 1}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      title,
      source,
      url,
      retrievedAt: citation.retrievedAt || retrievedAt,
      updatedAt: citation.updatedAt,
      category: citation.category
    }];
  });
}
