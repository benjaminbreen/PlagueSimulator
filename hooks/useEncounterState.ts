import { useState } from 'react';
import { AgentState, NPCStats } from '../types';

export const useEncounterState = () => {
  const [selectedNpc, setSelectedNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
  const [nearSpeakableNpc, setNearSpeakableNpc] = useState<{ stats: NPCStats; state: AgentState } | null>(null);
  const [isNPCInitiatedEncounter, setIsNPCInitiatedEncounter] = useState(false);
  const [isFollowingAfterDismissal, setIsFollowingAfterDismissal] = useState(false);
  const [selectedNpcActivity, setSelectedNpcActivity] = useState('');
  const [selectedNpcNearbyInfected, setSelectedNpcNearbyInfected] = useState(0);
  const [selectedNpcNearbyDeceased, setSelectedNpcNearbyDeceased] = useState(0);
  const [selectedNpcRumors, setSelectedNpcRumors] = useState<string[]>([]);

  return {
    selectedNpc,
    setSelectedNpc,
    nearSpeakableNpc,
    setNearSpeakableNpc,
    isNPCInitiatedEncounter,
    setIsNPCInitiatedEncounter,
    isFollowingAfterDismissal,
    setIsFollowingAfterDismissal,
    selectedNpcActivity,
    setSelectedNpcActivity,
    selectedNpcNearbyInfected,
    setSelectedNpcNearbyInfected,
    selectedNpcNearbyDeceased,
    setSelectedNpcNearbyDeceased,
    selectedNpcRumors,
    setSelectedNpcRumors
  };
};
