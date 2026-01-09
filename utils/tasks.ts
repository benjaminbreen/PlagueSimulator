import { BuildingMetadata, BuildingType, DistrictType, FamilyMember, PlayerStats, PlayerTask, PlayerTaskTarget, getDistrictType, getLocationLabel } from '../types';
import { seededRandom } from './procedural';
import { getRelationshipLabel } from './family';

type TaskContext = {
  mapX: number;
  mapY: number;
  buildings: BuildingMetadata[];
  seed: number;
  familyMembers?: FamilyMember[];
  homeBuildingId?: string | null;
  homeMapPosition?: { mapX: number; mapY: number } | null;
};

type TaskTemplate = {
  id: string;
  matches: (profession: string) => boolean;
  build: (player: PlayerStats, context: TaskContext, rand: () => number) => PlayerTask | null;
};

const GRID_RADIUS = 3;

const collectDistrictTiles = (districts: DistrictType[]) => {
  const tiles: Array<{ mapX: number; mapY: number; district: DistrictType; locationLabel: string }> = [];
  for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x += 1) {
    for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y += 1) {
      const district = getDistrictType(x, y);
      if (districts.includes(district)) {
        tiles.push({ mapX: x, mapY: y, district, locationLabel: getLocationLabel(x, y) });
      }
    }
  }
  return tiles;
};

const chooseTile = (
  tiles: Array<{ mapX: number; mapY: number; district: DistrictType; locationLabel: string }>,
  origin: { mapX: number; mapY: number },
  rand: () => number
) => {
  if (tiles.length === 0) return null;
  const weights = tiles.map((tile) => {
    const dist = Math.hypot(tile.mapX - origin.mapX, tile.mapY - origin.mapY);
    return 1 / (1 + dist);
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rand() * total;
  for (let i = 0; i < tiles.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return tiles[i];
  }
  return tiles[tiles.length - 1];
};

const buildDistrictTarget = (
  districts: DistrictType[],
  context: TaskContext,
  rand: () => number,
  label: string
): PlayerTaskTarget | null => {
  const tiles = collectDistrictTiles(districts);
  const pick = chooseTile(tiles, { mapX: context.mapX, mapY: context.mapY }, rand);
  if (!pick) return null;
  return {
    kind: 'district',
    mapX: pick.mapX,
    mapY: pick.mapY,
    label,
    locationLabel: pick.locationLabel
  };
};

const buildBuildingTarget = (
  buildings: BuildingMetadata[],
  type: BuildingType,
  context: TaskContext,
  label: string
): PlayerTaskTarget | null => {
  const match = buildings.find((building) => building.type === type);
  if (!match) return null;
  return {
    kind: 'building',
    mapX: context.mapX,
    mapY: context.mapY,
    buildingId: match.id,
    label,
    locationLabel: getLocationLabel(context.mapX, context.mapY)
  };
};

const pickFamilyFocus = (members: FamilyMember[] = []) => {
  const spouse = members.find((member) => member.relationship === 'spouse' && member.alive);
  if (spouse) return spouse;
  const child = members.find((member) => member.relationship === 'child' && member.alive);
  if (child) return child;
  return members.find((member) => member.alive) ?? null;
};

const buildHomeTarget = (context: TaskContext, label: string): PlayerTaskTarget | null => {
  if (!context.homeMapPosition) return null;
  return {
    kind: 'home',
    mapX: context.homeMapPosition.mapX,
    mapY: context.homeMapPosition.mapY,
    buildingId: context.homeBuildingId ?? undefined,
    label,
    locationLabel: getLocationLabel(context.homeMapPosition.mapX, context.homeMapPosition.mapY)
  };
};

const buildTask = (id: string, title: string, description: string, target?: PlayerTaskTarget | null): PlayerTask => ({
  id,
  title,
  description,
  status: 'active',
  target: target ?? undefined
});

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'fetch-water',
    matches: (profession) => /Washer|Laundry|Water-Bearer|Water-Carrier/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['RABWE', 'QANAWAT', 'NORTH_GHOUTA', 'SOUTH_GHOUTA'], context, rand, 'river or cistern');
      if (!target) return null;
      return buildTask(
        'fetch-water',
        'Fetch Water',
        `Fetch clean water at the ${target.label} in ${target.locationLabel}, then return to your household.`,
        target
      );
    }
  },
  {
    id: 'textile-delivery',
    matches: (profession) => /Spinner|Weaver|Textile|Dyer/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['MARKET', 'SOUQ_AXIS', 'CARAVANSERAI'], context, rand, 'workshop');
      if (!target) return null;
      return buildTask(
        'textile-delivery',
        'Deliver Yarn',
        `Bring your yarn to the ${target.label} in ${target.locationLabel} and speak with a patron.`,
        target
      );
    }
  },
  {
    id: 'baker-supplies',
    matches: (profession) => /Bread|Baker|Food|Cook|Seller|Vendor/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['OUTSKIRTS_FARMLAND', 'NORTH_GHOUTA', 'SOUTH_GHOUTA', 'QANAWAT'], context, rand, 'grain supplier');
      if (!target) return null;
      return buildTask(
        'baker-supplies',
        'Collect Grain',
        `Collect grain from the ${target.label} in ${target.locationLabel}, then return to your stall.`,
        target
      );
    }
  },
  {
    id: 'porter-hire',
    matches: (profession) => /Porter|Laborer|Day-Laborer|Carrier/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['CARAVANSERAI', 'MIDAN', 'CIVIC'], context, rand, 'khan yard');
      if (!target) return null;
      return buildTask(
        'porter-hire',
        'Find Work',
        `Report to the ${target.label} in ${target.locationLabel} and wait for hire.`,
        target
      );
    }
  },
  {
    id: 'scholar-delivery',
    matches: (profession) => /Teacher|Copyist|Scribe|Madrasa|Qur'an|Reciter/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['SALHIYYA', 'UMAYYAD_MOSQUE'], context, rand, 'madrasa');
      if (!target) return null;
      return buildTask(
        'scholar-delivery',
        'Deliver a Copy',
        `Visit the ${target.label} in ${target.locationLabel} to deliver a copy and speak with a teacher.`,
        target
      );
    }
  },
  {
    id: 'mosque-duty',
    matches: (profession) => /Muezzin|Imam|Qadi|Mufti|Clergy/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['UMAYYAD_MOSQUE', 'SALHIYYA'], context, rand, 'mosque');
      if (!target) return null;
      return buildTask(
        'mosque-duty',
        'Attend the Mosque',
        `Go to the ${target.label} in ${target.locationLabel} to meet an elder before the next prayer.`,
        target
      );
    }
  },
  {
    id: 'healer-supplies',
    matches: (profession) => /Apothecary|Herbalist|Hakim|Physician|Healer|Midwife/i.test(profession),
    build: (_player, context, rand) => {
      const buildingTarget = buildBuildingTarget(context.buildings, BuildingType.MEDICAL, context, 'clinic');
      if (buildingTarget) {
        return buildTask(
          'healer-supplies',
          'Attend the Clinic',
          `Visit the ${buildingTarget.label} nearby to check on your patients and supplies.`,
          buildingTarget
        );
      }
      const target = buildDistrictTarget(['MARKET', 'SALHIYYA'], context, rand, 'herbalist stalls');
      if (!target) return null;
      return buildTask(
        'healer-supplies',
        'Gather Remedies',
        `Gather herbs from the ${target.label} in ${target.locationLabel}, then return to your work.`,
        target
      );
    }
  },
  {
    id: 'guard-report',
    matches: (profession) => /Guard|Officer|Inspector|Mamluk|Steward|Court Clerk/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['CIVIC', 'SOUQ_AXIS'], context, rand, 'civic office');
      if (!target) return null;
      return buildTask(
        'guard-report',
        'Report for Duty',
        `Walk to the ${target.label} in ${target.locationLabel} and check in with your superior.`,
        target
      );
    }
  },
  {
    id: 'craftsperson-supplies',
    matches: (profession) => /Carpenter|Potter|Tanner|Coppersmith|Blacksmith|Smith|Mason|Artisan/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['MARKET', 'CARAVANSERAI', 'SOUQ_AXIS'], context, rand, 'market row');
      if (!target) return null;
      return buildTask(
        'craftsperson-supplies',
        'Collect Materials',
        `Retrieve materials from the ${target.label} in ${target.locationLabel}, then return to your workshop.`,
        target
      );
    }
  },
  {
    id: 'merchant-sale',
    matches: (profession) => /Merchant|Trader|Draper|Spice/i.test(profession),
    build: (_player, context, rand) => {
      const target = buildDistrictTarget(['MARKET', 'SOUQ_AXIS', 'CARAVANSERAI'], context, rand, 'market hub');
      if (!target) return null;
      return buildTask(
        'merchant-sale',
        'Make a Sale',
        `Go to the ${target.label} in ${target.locationLabel} and sell your goods for profit.`,
        target
      );
    }
  },
  {
    id: 'household-errand',
    matches: (profession) => /Servant|Household|Charity Worker|Tutor|Manager/i.test(profession),
    build: (player, context, rand) => {
      const familyFocus = pickFamilyFocus(context.familyMembers);
      const homeTarget = buildHomeTarget(context, 'home');
      if (homeTarget && familyFocus) {
        const relation = getRelationshipLabel(familyFocus.relationship, familyFocus.gender).toLowerCase();
        return buildTask(
          'household-errand',
          'Household Errand',
          `Find your ${relation}, ${familyFocus.name}, at ${homeTarget.label} and pass along a message.`,
          homeTarget
        );
      }
      if (homeTarget) {
        return buildTask(
          'household-errand',
          'Household Errand',
          `Return to ${homeTarget.label} in ${homeTarget.locationLabel} to check on your household.`,
          homeTarget
        );
      }
      const fallback = buildDistrictTarget(['RESIDENTIAL', 'AMARA'], context, rand, 'household');
      if (!fallback) return null;
      return buildTask(
        'household-errand',
        'Household Errand',
        `Visit a ${fallback.label} in ${fallback.locationLabel} to deliver word from your employer.`,
        fallback
      );
    }
  },
  {
    id: 'traveler-rest',
    matches: (_profession) => true,
    build: (_player, context, rand) => {
      const buildingTarget = buildBuildingTarget(context.buildings, BuildingType.HOSPITALITY, context, 'inn');
      if (buildingTarget) {
        return buildTask(
          'traveler-rest',
          'Find Rest',
          `Locate the ${buildingTarget.label} nearby and secure a place to rest.`,
          buildingTarget
        );
      }
      const target = buildDistrictTarget(['JABIYA_ROAD', 'CARAVANSERAI', 'SOUTHERN_ROAD', 'BAB_SHARQI'], context, rand, 'inn quarter');
      if (!target) return null;
      return buildTask(
        'traveler-rest',
        'Find Rest',
        `Locate an ${target.label} in ${target.locationLabel} and secure a place to rest.`,
        target
      );
    }
  }
];

export const generateInitialTask = (player: PlayerStats, context: TaskContext): PlayerTask | null => {
  const seedBase = context.seed + Math.floor(context.mapX * 31 + context.mapY * 57);
  let s = seedBase * 13 + 7;
  const rand = () => seededRandom(s++);
  const profession = player.profession;
  const matches = TASK_TEMPLATES.filter((template) => template.matches(profession));
  if (matches.length === 0) return null;
  const pick = matches[0];
  return pick.build(player, context, rand);
};
