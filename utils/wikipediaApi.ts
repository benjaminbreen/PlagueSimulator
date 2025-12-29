// Wikipedia API Integration for Historical Guide
// Uses Wikipedia's REST API (no authentication required)

import { WikipediaResponse } from '../components/HistoricalGuide/types';

const WIKI_REST_API = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_ACTION_API = 'https://en.wikipedia.org/w/api.php';

// Session-based cache for Wikipedia content
const wikiCache = new Map<string, WikipediaResponse>();

/**
 * Fetches a Wikipedia article extract by search term
 * Uses two-step process: search for page title, then fetch summary
 */
export async function fetchWikipediaExtract(
  searchTerm: string
): Promise<WikipediaResponse | null> {
  try {
    // Step 1: Search for the page to get exact title
    const searchUrl = `${WIKI_ACTION_API}?` +
      `action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}` +
      `&format=json&origin=*&srlimit=1`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.warn('Wikipedia search failed:', searchRes.status);
      return null;
    }

    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) {
      console.warn('No Wikipedia results for:', searchTerm);
      return null;
    }

    const pageTitle = searchData.query.search[0].title;

    // Step 2: Fetch the page summary using REST API
    const summaryUrl = `${WIKI_REST_API}/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl);

    if (!summaryRes.ok) {
      console.warn('Wikipedia summary fetch failed:', summaryRes.status);
      return null;
    }

    const data = await summaryRes.json();

    return {
      title: data.title || pageTitle,
      extract: data.extract || 'No summary available.',
      pageUrl: data.content_urls?.desktop?.page ||
               `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      thumbnail: data.thumbnail?.source,
    };
  } catch (error) {
    console.error('Wikipedia API error:', error);
    return null;
  }
}

/**
 * Gets Wikipedia content with caching
 * Returns cached content if available, otherwise fetches and caches
 */
export async function getWikipediaContent(
  searchTerm: string
): Promise<WikipediaResponse | null> {
  // Check cache first
  if (wikiCache.has(searchTerm)) {
    return wikiCache.get(searchTerm) || null;
  }

  // Fetch and cache
  const result = await fetchWikipediaExtract(searchTerm);
  if (result) {
    wikiCache.set(searchTerm, result);
  }
  return result;
}

/**
 * Clears the Wikipedia cache (if needed for testing)
 */
export function clearWikipediaCache(): void {
  wikiCache.clear();
}

/**
 * Gets cache statistics
 */
export function getWikipediaCacheStats(): { size: number; entries: string[] } {
  return {
    size: wikiCache.size,
    entries: Array.from(wikiCache.keys()),
  };
}
