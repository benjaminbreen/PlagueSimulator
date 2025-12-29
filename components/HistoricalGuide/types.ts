// Historical Guide Type Definitions

export type GuideCategory =
  | 'religions'
  | 'ethnicities'
  | 'professions'
  | 'districts'
  | 'dailyLife'
  | 'thePlague';

export interface GuideEntry {
  id: string;
  category: GuideCategory;
  title: string;
  subtitle?: string;
  shortDescription: string;
  fullDescription: string;
  historicalContext: string;
  inGameRelevance: string;
  wikipediaSearchTerm?: string;
  relatedEntries?: string[];
  tags?: string[];
}

export interface WikipediaResponse {
  title: string;
  extract: string;
  pageUrl: string;
  thumbnail?: string;
}

export interface GuideContextItem {
  entry: GuideEntry;
  relevance: 'high' | 'medium' | 'low';
  reason: string;
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  religions: 'Religions',
  ethnicities: 'Ethnicities',
  professions: 'Professions',
  districts: 'Districts',
  dailyLife: 'Daily Life',
  thePlague: 'The Plague',
};

export const CATEGORY_ORDER: GuideCategory[] = [
  'religions',
  'ethnicities',
  'professions',
  'districts',
  'dailyLife',
  'thePlague',
];
