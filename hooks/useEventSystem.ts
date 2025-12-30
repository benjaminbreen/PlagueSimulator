import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationImpact, applyConversationImpact } from '../utils/friendliness';
import { checkConversationTrigger, getBiomeForDistrict } from '../utils/eventTriggers';
import { getEventsForBiome, getEventById } from '../utils/events/catalog';
import { evaluateTriggers, TriggerState } from '../utils/events/triggerSystem';
import { getDistrictType } from '../types';
import {
  EventContextSnapshot,
  EventDefinition,
  EventEffect,
  EventInstance,
  EventOption,
  NPCRecord,
  PlayerStats,
  SimulationParams
} from '../types';
import { TriggerTargetType, TriggerWhen } from '../utils/events/triggerCatalog';

interface UseEventSystemArgs {
  params: SimulationParams;
  currentWeather: string;
  playerStats: PlayerStats;
  statsSimTime: number;
  outdoorNpcPool: NPCRecord[];
  setOutdoorNpcPool: React.Dispatch<React.SetStateAction<NPCRecord[]>>;
  setConversationHistories: React.Dispatch<React.SetStateAction<import('../types').ConversationSummary[]>>;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  setSelectedNpc: React.Dispatch<React.SetStateAction<NPCRecord | null>>;
  setShowEncounterModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNPCInitiatedEncounter: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFollowingAfterDismissal: React.Dispatch<React.SetStateAction<boolean>>;
  setWorldFlags: React.Dispatch<React.SetStateAction<Record<string, boolean | number | string>>>;
  npcThreatMemoryRef: React.MutableRefObject<Record<string, { count: number; lastSimTime: number }>>;
}

export const useEventSystem = ({
  params,
  currentWeather,
  playerStats,
  statsSimTime,
  outdoorNpcPool,
  setOutdoorNpcPool,
  setConversationHistories,
  setPlayerStats,
  setSelectedNpc,
  setShowEncounterModal,
  setIsNPCInitiatedEncounter,
  setIsFollowingAfterDismissal,
  setWorldFlags,
  npcThreatMemoryRef
}: UseEventSystemArgs) => {
  const [activeEvent, setActiveEvent] = useState<EventInstance | null>(null);
  const [eventQueue, setEventQueue] = useState<EventInstance[]>([]);
  const [llmEventsEnabled, setLlmEventsEnabled] = useState(false);
  const [lastEventNote, setLastEventNote] = useState<string | null>(null);

  const eventCooldownsRef = useRef<Record<string, number>>({});
  const suppressDismissalEventRef = useRef(false);
  const dismissedNpcRef = useRef<{ npcId: string; npcName: string } | null>(null);

  const initialTriggerState = useMemo<TriggerState>(() => {
    try {
      const raw = localStorage.getItem('eventTriggerState');
      return raw ? JSON.parse(raw) : { counts: {}, lastTriggeredDay: {} };
    } catch {
      return { counts: {}, lastTriggeredDay: {} };
    }
  }, []);
  const triggerStateRef = useRef<TriggerState>(initialTriggerState);

  useEffect(() => {
    if (!lastEventNote) return;
    const timeout = window.setTimeout(() => setLastEventNote(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [lastEventNote]);

  const enqueueEvent = useCallback((event: EventInstance) => {
    if (!activeEvent) {
      setActiveEvent(event);
    } else {
      setEventQueue(prev => [...prev, event]);
    }
  }, [activeEvent]);

  const buildEventContext = useCallback((overrides?: Partial<EventContextSnapshot>): EventContextSnapshot => {
    const district = getDistrictType(params.mapX, params.mapY);
    return {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      environment: {
        district,
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      },
      ...overrides
    };
  }, [currentWeather, params.mapX, params.mapY, params.timeOfDay, playerStats]);

  const makeEventInstance = useCallback((def: EventDefinition, source: EventInstance['source'], context: EventContextSnapshot): EventInstance => {
    return {
      id: `${def.id}-${Date.now()}`,
      source,
      context,
      content: {
        title: def.title,
        body: def.body,
        options: def.options
      },
      definitionId: def.id
    };
  }, []);

  const mapEffectKey = useCallback((effectKey: string): EventEffect[] => {
    switch (effectKey) {
      case 'end_conversation':
        return [{ type: 'endConversation' }];
      case 'bribe_small':
        return [{ type: 'playerStat', stat: 'currency', delta: -2 }];
      case 'bribe_large':
        return [{ type: 'playerStat', stat: 'currency', delta: -5 }];
      case 'health_up':
        return [{ type: 'playerStat', stat: 'health', delta: 5 }];
      case 'health_down':
        return [{ type: 'playerStat', stat: 'health', delta: -5 }];
      case 'reputation_up':
        return [{ type: 'playerStat', stat: 'reputation', delta: 3 }];
      case 'reputation_down':
        return [{ type: 'playerStat', stat: 'reputation', delta: -3 }];
      case 'wealth_up':
        return [{ type: 'playerStat', stat: 'wealth', delta: 4 }];
      case 'wealth_down':
        return [{ type: 'playerStat', stat: 'wealth', delta: -4 }];
      case 'flee':
        return [{ type: 'worldFlag', key: 'fled', value: true }];
      case 'appeal_faith':
        return [{ type: 'playerStat', stat: 'piety', delta: 1 }];
      case 'calm_crowd':
        return [{ type: 'worldFlag', key: 'calmed_crowd', value: true }];
      case 'escalate':
        return [{ type: 'worldFlag', key: 'escalated', value: true }];
      default:
        return [];
    }
  }, []);

  const buildLlmEventInstance = useCallback((baseEvent: EventInstance, payload: {
    title: string;
    body: string;
    options: Array<{
      id?: string;
      label: string;
      effectKey: string;
      outcomeText?: string;
      followupEventId?: string;
      requirements?: { stat?: 'charisma' | 'piety' | 'currency' | 'health' | 'reputation' | 'wealth'; min?: number; max?: number };
    }>;
  }): EventInstance => {
    const options = payload.options
      .filter(option => typeof option.label === 'string' && option.label.trim().length > 0)
      .slice(0, 4)
      .map((option, index) => ({
        id: option.id || `opt-${index + 1}`,
        label: option.label.trim(),
        outcomeText: option.outcomeText,
        followupEventId: option.followupEventId && getEventById(option.followupEventId)
          ? option.followupEventId
          : undefined,
        requirements: option.requirements?.stat ? {
          stat: option.requirements.stat,
          min: option.requirements.min,
          max: option.requirements.max
        } : undefined,
        effects: mapEffectKey(option.effectKey)
      }));

    return {
      ...baseEvent,
      content: {
        title: payload.title,
        body: payload.body,
        options
      }
    };
  }, [mapEffectKey]);

  const enqueueEventWithOptionalLLM = useCallback(async (event: EventInstance) => {
    if (!llmEventsEnabled) {
      enqueueEvent(event);
      return;
    }

    try {
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: event.context,
          eventSeed: event.definitionId
        })
      });

      if (!response.ok) {
        enqueueEvent(event);
        return;
      }

      const data = await response.json();
      const text = data.response;
      if (!text) {
        enqueueEvent(event);
        return;
      }

      const parsed = JSON.parse(text);
      const validOptions = Array.isArray(parsed.options) && parsed.options.length >= 2;
      if (!parsed.title || !parsed.body || !validOptions) {
        enqueueEvent(event);
        return;
      }

      const llmEvent = buildLlmEventInstance(event, parsed);
      if (llmEvent.content.options.length < 2) {
        enqueueEvent(event);
        return;
      }
      enqueueEvent(llmEvent);
    } catch {
      enqueueEvent(event);
    }
  }, [buildLlmEventInstance, enqueueEvent, llmEventsEnabled]);

  const tryTriggerEvent = useCallback((params: {
    when: TriggerWhen;
    targetType: TriggerTargetType;
    targetId: string;
    contextOverrides?: Partial<EventContextSnapshot>;
    source: EventInstance['source'];
  }) => {
    const dayIndex = Math.floor(statsSimTime);
    const def = evaluateTriggers({
      when: params.when,
      targetType: params.targetType,
      targetId: params.targetId,
      dayIndex,
      state: triggerStateRef.current
    });
    if (!def) return;

    const context = buildEventContext(params.contextOverrides);
    const event = makeEventInstance(def, params.source, context);
    setLastEventNote(`${params.when}:${params.targetType}:${params.targetId}`);
    try {
      localStorage.setItem('eventTriggerState', JSON.stringify(triggerStateRef.current));
    } catch {
      // Ignore storage errors.
    }
    void enqueueEventWithOptionalLLM(event);
  }, [buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, statsSimTime]);

  const applyEffects = useCallback((effects: EventEffect[]) => {
    effects.forEach(effect => {
      if (effect.type === 'playerStat') {
        const clampStat = (stat: EventEffect['stat'], value: number) => {
          if (stat === 'health' || stat === 'reputation' || stat === 'wealth') {
            return Math.max(0, Math.min(100, value));
          }
          return value;
        };
        setPlayerStats(prev => ({
          ...prev,
          [effect.stat]: clampStat(
            effect.stat,
            (prev[effect.stat] as number) + effect.delta
          )
        }));
      } else if (effect.type === 'npcStat') {
        setOutdoorNpcPool(prev => prev.map(record => {
          if (record.stats.id !== effect.npcId) return record;
          return {
            ...record,
            stats: {
              ...record.stats,
              disposition: effect.stat === 'disposition' ? record.stats.disposition + effect.delta : record.stats.disposition,
              panicLevel: effect.stat === 'panic' ? record.stats.panicLevel + effect.delta : record.stats.panicLevel
            }
          };
        }));
      } else if (effect.type === 'worldFlag') {
        setWorldFlags(prev => ({ ...prev, [effect.key]: effect.value }));
      } else if (effect.type === 'triggerEvent') {
        const def = getEventById(effect.eventId);
        if (!def) return;
        const context = buildEventContext();
        void enqueueEventWithOptionalLLM(makeEventInstance(def, 'system', context));
      } else if (effect.type === 'endConversation') {
        setShowEncounterModal(false);
      }
    });
  }, [buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, setOutdoorNpcPool, setPlayerStats, setShowEncounterModal, setWorldFlags]);

  const resolveEvent = useCallback((option: EventOption) => {
    applyEffects(option.effects);

    if (option.id === 'insist_follow' && dismissedNpcRef.current) {
      const dismissedNpc = dismissedNpcRef.current;
      setOutdoorNpcPool(prev => prev.map(record => {
        if (record.stats.id !== dismissedNpc.npcId) return record;
        return {
          ...record,
          stats: {
            ...record.stats,
            disposition: Math.max(0, record.stats.disposition - 25),
            panicLevel: Math.min(100, record.stats.panicLevel + 15)
          }
        };
      }));

      const npcRecord = outdoorNpcPool.find(r => r.stats.id === dismissedNpc.npcId);
      if (npcRecord) {
        setTimeout(() => {
          setSelectedNpc(npcRecord);
          setIsNPCInitiatedEncounter(false);
          setIsFollowingAfterDismissal(true);
          setShowEncounterModal(true);
        }, 500);
      }

      dismissedNpcRef.current = null;
    }

    if (option.followupEventId) {
      const def = getEventById(option.followupEventId);
      if (def) {
        const context = buildEventContext();
        const followup = makeEventInstance(def, 'system', context);
        void enqueueEventWithOptionalLLM(followup);
      }
    }
    setEventQueue(prev => {
      const [next, ...rest] = prev;
      setActiveEvent(next || null);
      return rest;
    });
  }, [applyEffects, buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, outdoorNpcPool, setIsFollowingAfterDismissal, setIsNPCInitiatedEncounter, setSelectedNpc, setShowEncounterModal, setOutdoorNpcPool]);

  const handleConversationResult = useCallback((npcId: string, summary: import('../types').ConversationSummary, impact: ConversationImpact, meta?: { action?: 'end_conversation' | null }) => {
    setConversationHistories(prev => [...prev, summary]);

    setOutdoorNpcPool(prev => prev.map(record => {
      if (record.stats.id !== npcId) return record;
      const { newDisposition, newPanicLevel } = applyConversationImpact(record.stats, impact);
      return {
        ...record,
        stats: {
          ...record.stats,
          disposition: newDisposition,
          panicLevel: newPanicLevel
        }
      };
    }));

    const npcRecord = outdoorNpcPool.find(record => record.stats.id === npcId);
    if (!npcRecord) return;

    const threatEntry = npcThreatMemoryRef.current[npcId];
    const recentWindow = 1;
    let threatCount = threatEntry?.count ?? 0;
    if (impact.threatLevel >= 40 || impact.offenseLevel >= 50) {
      if (!threatEntry || statsSimTime - threatEntry.lastSimTime > recentWindow) {
        threatCount = 1;
      } else {
        threatCount += 1;
      }
      npcThreatMemoryRef.current[npcId] = { count: threatCount, lastSimTime: statsSimTime };
    }

    const context: EventContextSnapshot = {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      npc: {
        id: npcRecord.stats.id,
        name: npcRecord.stats.name,
        profession: npcRecord.stats.profession,
        socialClass: npcRecord.stats.socialClass,
        disposition: npcRecord.stats.disposition,
        panic: npcRecord.stats.panicLevel,
        religion: npcRecord.stats.religion
      },
      environment: {
        district: getDistrictType(params.mapX, params.mapY),
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      },
      flags: {
        threatMemory: threatCount
      }
    };

    const dayIndex = Math.floor(statsSimTime);
    const recentIds = Object.keys(eventCooldownsRef.current).filter(id => eventCooldownsRef.current[id] === dayIndex);
    const convoEvent = checkConversationTrigger(context, impact, recentIds);
    if (convoEvent) {
      eventCooldownsRef.current[convoEvent.definitionId || convoEvent.id] = dayIndex;
      if (meta?.action === 'end_conversation') {
        suppressDismissalEventRef.current = true;
      }
      void enqueueEventWithOptionalLLM(convoEvent);
    }
  }, [currentWeather, enqueueEventWithOptionalLLM, outdoorNpcPool, params.mapX, params.mapY, params.timeOfDay, playerStats, setConversationHistories, setOutdoorNpcPool, statsSimTime, npcThreatMemoryRef]);

  const handleTriggerConversationEvent = useCallback((eventId: string, npcContext?: { npcId: string; npcName: string }, delayMs = 0) => {
    if (eventId === 'npc_dismissed_player' && suppressDismissalEventRef.current) {
      suppressDismissalEventRef.current = false;
      return;
    }
    const def = getEventById(eventId);
    if (!def) return;

    if (npcContext) {
      dismissedNpcRef.current = npcContext;
    }

    const npcRecord = npcContext ? outdoorNpcPool.find(r => r.stats.id === npcContext.npcId) : undefined;
    const contextOverrides: Partial<EventContextSnapshot> = npcRecord ? {
      npc: {
        id: npcRecord.stats.id,
        name: npcRecord.stats.name,
        profession: npcRecord.stats.profession,
        socialClass: npcRecord.stats.socialClass,
        religion: npcRecord.stats.religion,
        disposition: npcRecord.stats.disposition,
        panic: npcRecord.stats.panicLevel
      }
    } : undefined;

    const context = buildEventContext(contextOverrides);
    const event = makeEventInstance(def, 'system', context);
    if (delayMs > 0) {
      window.setTimeout(() => {
        setShowEncounterModal(false);
        void enqueueEventWithOptionalLLM(event);
      }, delayMs);
    } else {
      setShowEncounterModal(false);
      void enqueueEventWithOptionalLLM(event);
    }
  }, [buildEventContext, enqueueEventWithOptionalLLM, makeEventInstance, outdoorNpcPool, setShowEncounterModal]);

  const handleDebugEvent = useCallback(() => {
    const district = getDistrictType(params.mapX, params.mapY);
    const biome = getBiomeForDistrict(district);
    const candidates = getEventsForBiome(biome);
    if (candidates.length === 0) return;

    const context: EventContextSnapshot = {
      player: {
        id: playerStats.id,
        name: playerStats.name,
        socialClass: playerStats.socialClass,
        stats: {
          charisma: playerStats.charisma,
          piety: playerStats.piety,
          currency: playerStats.currency,
          health: playerStats.health,
          reputation: playerStats.reputation,
          wealth: playerStats.wealth
        }
      },
      environment: {
        district,
        timeOfDay: params.timeOfDay,
        weather: currentWeather
      }
    };

    const event = makeEventInstance(candidates[0], 'system', context);
    void enqueueEventWithOptionalLLM(event);
  }, [currentWeather, enqueueEventWithOptionalLLM, makeEventInstance, params.mapX, params.mapY, params.timeOfDay, playerStats]);

  return {
    activeEvent,
    llmEventsEnabled,
    setLlmEventsEnabled,
    lastEventNote,
    tryTriggerEvent,
    resolveEvent,
    handleConversationResult,
    handleTriggerConversationEvent,
    handleDebugEvent
  };
};
