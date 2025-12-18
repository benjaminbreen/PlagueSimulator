
export enum AgentState {
  HEALTHY = 0,
  INCUBATING = 1,
  INFECTED = 2,
  DECEASED = 3,
}

export enum SocialClass {
  PEASANT = 'Peasant',
  MERCHANT = 'Merchant',
  CLERGY = 'Clergy',
  NOBILITY = 'Nobility',
}

export enum CameraMode {
  THIRD_PERSON = 'THIRD_PERSON',
  OVERHEAD = 'OVERHEAD',
  FIRST_PERSON = 'FIRST_PERSON',
}

export enum BuildingType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  RELIGIOUS = 'RELIGIOUS',
  CIVIC = 'CIVIC',
}

export interface NPCStats {
  id: string;
  name: string;
  age: number;
  profession: string;
  gender: 'Male' | 'Female';
  socialClass: SocialClass;
  height: number;
  weight: number;
  mood: string;
}

export interface PlayerStats {
  name: string;
  age: number;
  profession: string;
  gender: 'Male' | 'Female';
  socialClass: SocialClass;
  height: number;
  weight: number;
  family: string;
  healthStatus: string;
}

export interface BuildingMetadata {
  id: string;
  type: BuildingType;
  ownerName: string;
  ownerAge: number;
  ownerProfession: string;
  ownerGender: 'Male' | 'Female';
  position: [number, number, number];
  doorSide: number; // 0: North, 1: South, 2: East, 3: West
  hasSymmetricalWindows: boolean;
}

export interface SimulationParams {
  infectionRate: number; 
  hygieneLevel: number; 
  quarantine: boolean;
  simulationSpeed: number; 
  timeOfDay: number; 
  cameraMode: CameraMode;
  mapX: number;
  mapY: number;
  uiMinimized: boolean;
}

export interface SimulationStats {
  healthy: number;
  incubating: number;
  infected: number;
  deceased: number;
  daysPassed: number;
  simTime: number; 
}

export interface SimulationCounts {
  healthy: number;
  incubating: number;
  infected: number;
  deceased: number;
}

export const CONSTANTS = {
  AGENT_COUNT: 45,
  MARKET_SIZE: 60,
  BUILDING_SIZE: 8,
  STREET_WIDTH: 5,
  BOUNDARY: 75,
  PROXIMITY_THRESHOLD: 12,
  HOURS_TO_INCUBATE: 1,
  HOURS_TO_INFECTED: 2,
  HOURS_TO_DEATH: 24,
  REAL_SECONDS_PER_SIM_HOUR: 1, 
};

export interface PlayerState {
  position: [number, number, number];
  isMoving: boolean;
}

export const getLocationLabel = (x: number, y: number) => {
  if (x === 0 && y === 0) return "Al-Buzuriyah (Main Road)";
  if (x === 1 && y === 1) return "Bab Sharqi (Narrow Alleys)";
  if (x === -1 && y === 2) return "Al-Qaymariyya (Wealthy Quarter)";
  if (x === 0 && y === -2) return "Al-Shaghour (Poor Hovels)";
  if (x === 2 && y === -1) return "The Mamluk Citadel (Civic Quarter)";
  if (x === 1 && y === -1) return "Player's Home (Residential)";
  
  // Procedural names for other blocks
  const prefixes = ["Lower", "Upper", "North", "South", "East", "West"];
  const districts = ["Souk", "Maidan", "Harah", "Bazaar", "Quarter"];
  const seed = Math.abs(x * 31 + y * 7);
  const p = prefixes[seed % prefixes.length];
  const d = districts[(seed >> 2) % districts.length];
  return `${p} ${d} Block — ${x}, ${y}`;
};
