// Guide Context Detection
// Determines which historical guide entries are relevant to the player's current situation

import { GuideEntry, GuideContextItem } from '../components/HistoricalGuide/types';
import { GUIDE_ENTRIES } from './historicalGuideData';
import { NPCStats } from '../types';

// Map biome names to district entry IDs
// These map specific location names from getLocationLabel() to guide entries
const BIOME_TO_DISTRICT: Record<string, string> = {
  // Market areas
  'buzuriyah': 'market-district',
  'bazaar': 'market-district',
  'market': 'market-district',
  'marketplace': 'market-district',
  'suq': 'market-district',
  // Religious areas
  'umayyad': 'religious-district',
  'mosque': 'religious-district',
  'madrasa': 'religious-district',
  'religious': 'religious-district',
  // Wealthy/residential areas
  'salihiyya': 'wealthy-quarter',
  'qaymariyya': 'wealthy-quarter',
  'wealthy': 'wealthy-quarter',
  'hillside': 'wealthy-quarter',
  'palace': 'wealthy-quarter',
  // Poor areas
  'shaghour': 'slums',
  'hovels': 'slums',
  'poor': 'slums',
  'slum': 'slums',
  // Civic/citadel
  'citadel': 'residential-quarter',
  'mamluk': 'residential-quarter',
  'civic': 'residential-quarter',
  // Specific quarters
  'yahud': 'residential-quarter',
  'jewish': 'residential-quarter',
  'nasara': 'residential-quarter',
  'christian': 'residential-quarter',
  'bab sharqi': 'caravanserai',
  'eastern': 'caravanserai',
  // Trade areas
  'caravanserai': 'caravanserai',
  'khan': 'caravanserai',
  // Rural/outskirts
  'ghouta': 'residential-quarter',
  'farmland': 'residential-quarter',
  'desert': 'caravanserai',
  'outskirts': 'caravanserai',
};

/**
 * Finds a guide entry by ID
 */
function findEntryById(id: string): GuideEntry | undefined {
  return GUIDE_ENTRIES.find(entry => entry.id === id);
}

/**
 * Finds a guide entry by title (case-insensitive, flexible matching)
 */
function findEntryByTitle(
  category: GuideEntry['category'],
  title: string
): GuideEntry | undefined {
  const normalizedTitle = title.toLowerCase().trim();

  return GUIDE_ENTRIES.find(entry => {
    if (entry.category !== category) return false;

    // Exact match
    if (entry.title.toLowerCase() === normalizedTitle) return true;

    // ID match (e.g., "sunni-islam" matches "Sunni Islam")
    const titleAsId = normalizedTitle.replace(/\s+/g, '-').replace(/[\/]/g, '-');
    if (entry.id === titleAsId) return true;

    // Partial match for compound names
    if (entry.title.toLowerCase().includes(normalizedTitle)) return true;
    if (normalizedTitle.includes(entry.title.toLowerCase())) return true;

    return false;
  });
}

/**
 * Maps a biome name to its corresponding district entry
 */
function getBiomeEntry(biome: string): GuideEntry | undefined {
  const normalizedBiome = biome.toLowerCase();

  // Check direct mapping
  for (const [key, entryId] of Object.entries(BIOME_TO_DISTRICT)) {
    if (normalizedBiome.includes(key)) {
      return findEntryById(entryId);
    }
  }

  // Try to find by title
  return findEntryByTitle('districts', biome);
}

/**
 * Gets contextual guide entries based on current situation
 */
export function getContextualEntries(
  currentBiome: string,
  nearbyNPCs: NPCStats[],
  maxItems: number = 10
): GuideContextItem[] {
  const items: GuideContextItem[] = [];
  const addedIds = new Set<string>();

  // 1. Current biome/district (high relevance)
  const biomeEntry = getBiomeEntry(currentBiome);
  if (biomeEntry && !addedIds.has(biomeEntry.id)) {
    items.push({
      entry: biomeEntry,
      relevance: 'high',
      reason: `Current location`,
    });
    addedIds.add(biomeEntry.id);
  }

  // 2. Track unique attributes from nearby NPCs
  const seenEthnicities = new Set<string>();
  const seenReligions = new Set<string>();
  const seenProfessions = new Set<string>();

  // Process up to 8 nearby NPCs for variety
  for (const npc of nearbyNPCs.slice(0, 8)) {
    // Ethnicity entries (medium relevance)
    if (npc.ethnicity && !seenEthnicities.has(npc.ethnicity)) {
      seenEthnicities.add(npc.ethnicity);
      const entry = findEntryByTitle('ethnicities', npc.ethnicity);
      if (entry && !addedIds.has(entry.id)) {
        items.push({
          entry,
          relevance: 'medium',
          reason: `${npc.name} (${npc.ethnicity})`,
        });
        addedIds.add(entry.id);
      }
    }

    // Religion entries (medium relevance)
    if (npc.religion && !seenReligions.has(npc.religion)) {
      seenReligions.add(npc.religion);
      const entry = findEntryByTitle('religions', npc.religion);
      if (entry && !addedIds.has(entry.id)) {
        items.push({
          entry,
          relevance: 'medium',
          reason: `${npc.name} (${npc.religion})`,
        });
        addedIds.add(entry.id);
      }
    }

    // Profession entries (low relevance, fewer shown)
    if (npc.profession && !seenProfessions.has(npc.profession)) {
      seenProfessions.add(npc.profession);
      const entry = findEntryByTitle('professions', npc.profession);
      if (entry && !addedIds.has(entry.id) && seenProfessions.size <= 3) {
        items.push({
          entry,
          relevance: 'low',
          reason: `${npc.name} (${npc.profession})`,
        });
        addedIds.add(entry.id);
      }
    }
  }

  // Sort by relevance and limit
  const relevanceOrder: Record<GuideContextItem['relevance'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return items
    .sort((a, b) => relevanceOrder[a.relevance] - relevanceOrder[b.relevance])
    .slice(0, maxItems);
}

/**
 * Gets all entries for a specific category
 */
export function getEntriesByCategory(category: GuideEntry['category']): GuideEntry[] {
  return GUIDE_ENTRIES.filter(entry => entry.category === category);
}

/**
 * Searches entries by title, tags, or content
 */
export function searchEntries(query: string): GuideEntry[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  return GUIDE_ENTRIES.filter(entry => {
    // Search in title
    if (entry.title.toLowerCase().includes(normalizedQuery)) return true;

    // Search in subtitle
    if (entry.subtitle?.toLowerCase().includes(normalizedQuery)) return true;

    // Search in short description
    if (entry.shortDescription.toLowerCase().includes(normalizedQuery)) return true;

    // Search in tags
    if (entry.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))) return true;

    return false;
  });
}

/**
 * Gets related entries for a given entry
 */
export function getRelatedEntries(entry: GuideEntry): GuideEntry[] {
  if (!entry.relatedEntries || entry.relatedEntries.length === 0) {
    return [];
  }

  return entry.relatedEntries
    .map(id => findEntryById(id))
    .filter((e): e is GuideEntry => e !== undefined);
}
