import { DistrictType } from '../../types';

export type TriggerWhen = 'districtEnter' | 'npcApproach' | 'interiorEnter' | 'merchantOpen';
export type TriggerTargetType =
  | 'district'
  | 'npcProfession'
  | 'buildingType'
  | 'buildingDistrict'
  | 'interiorAny'
  | 'merchantAny';

export interface EventTrigger {
  id: string;
  eventId: string;
  when: TriggerWhen;
  targetType: TriggerTargetType;
  targetId: string;
  nth?: number;
  chance?: number;
  cooldownDays?: number;
}

export const EVENT_TRIGGERS: EventTrigger[] = [
  {
    id: 'district_market_first',
    eventId: 'event_district_market_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'MARKET',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_hovels_first',
    eventId: 'event_district_hovels_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'HOVELS',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_wealthy_first',
    eventId: 'event_district_wealthy_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'WEALTHY',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_civic_first',
    eventId: 'event_district_civic_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'CIVIC',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_salhiyya_first',
    eventId: 'event_district_salhiyya_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'SALHIYYA',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_umayyad_first',
    eventId: 'event_district_umayyad_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'UMAYYAD_MOSQUE',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'district_umayyad_second',
    eventId: 'event_district_umayyad_second',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'UMAYYAD_MOSQUE',
    nth: 2,
    chance: 0.5
  },
  {
    id: 'district_caravanserai_first',
    eventId: 'event_district_caravanserai_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'CARAVANSERAI',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'district_desert_first',
    eventId: 'event_district_desert_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'OUTSKIRTS_DESERT',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'district_southern_road_first',
    eventId: 'event_district_southern_road_first',
    when: 'districtEnter',
    targetType: 'district',
    targetId: 'SOUTHERN_ROAD',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'npc_astrologer_first',
    eventId: 'event_npc_astrologer_first',
    when: 'npcApproach',
    targetType: 'npcProfession',
    targetId: 'Astrologer & Astronomer',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'npc_astrologer_second',
    eventId: 'event_npc_astrologer_second',
    when: 'npcApproach',
    targetType: 'npcProfession',
    targetId: 'Astrologer & Astronomer',
    nth: 2,
    chance: 0.5
  },
  {
    id: 'npc_scribe_first',
    eventId: 'event_npc_scribe_first',
    when: 'npcApproach',
    targetType: 'npcProfession',
    targetId: 'Scribe & Calligrapher',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'npc_snake_charmer_first',
    eventId: 'event_npc_snake_charmer_first',
    when: 'npcApproach',
    targetType: 'npcProfession',
    targetId: 'Sufi Snake Charmer',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'interior_first_any',
    eventId: 'event_interior_first_any',
    when: 'interiorEnter',
    targetType: 'interiorAny',
    targetId: 'any',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'interior_first_religious',
    eventId: 'event_interior_first_religious',
    when: 'interiorEnter',
    targetType: 'buildingType',
    targetId: 'RELIGIOUS',
    nth: 1,
    chance: 0.8
  },
  {
    id: 'interior_first_civic',
    eventId: 'event_interior_first_civic',
    when: 'interiorEnter',
    targetType: 'buildingType',
    targetId: 'CIVIC',
    nth: 1,
    chance: 0.8
  },
  {
    id: 'interior_first_wealthy',
    eventId: 'event_interior_first_wealthy',
    when: 'interiorEnter',
    targetType: 'buildingDistrict',
    targetId: 'WEALTHY',
    nth: 1,
    chance: 0.6
  },
  {
    id: 'merchant_first_trade',
    eventId: 'event_merchant_first_trade',
    when: 'merchantOpen',
    targetType: 'merchantAny',
    targetId: 'any',
    nth: 1,
    chance: 0.7
  },
  {
    id: 'merchant_second_trade',
    eventId: 'event_merchant_second_trade',
    when: 'merchantOpen',
    targetType: 'merchantAny',
    targetId: 'any',
    nth: 2,
    chance: 0.5
  }
];
