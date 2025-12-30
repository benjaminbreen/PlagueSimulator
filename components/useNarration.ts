import { useCallback, useEffect, useRef, useState } from 'react';
import { getDistrictType } from '../types';
import { getNarratorTextForDistrict } from '../utils/narration';

export const useNarration = (mapX: number, mapY: number, timeOfDay: number) => {
  const [narratorMessage, setNarratorMessage] = useState<string | null>(null);
  const [narratorKey, setNarratorKey] = useState(0);
  const [narratorHistory, setNarratorHistory] = useState<string[]>([]);
  const [narratorOpen, setNarratorOpen] = useState(false);
  const skipFirstNarrationRef = useRef(true);
  const narratorTimeoutRef = useRef<number | null>(null);

  const pushNarration = useCallback((text: string) => {
    setNarratorMessage(text);
    setNarratorHistory((prev) => [...prev, text]);
    setNarratorKey((prev) => prev + 1);
    if (narratorTimeoutRef.current) {
      window.clearTimeout(narratorTimeoutRef.current);
    }
    narratorTimeoutRef.current = window.setTimeout(() => setNarratorMessage(null), 10000);
  }, []);

  useEffect(() => {
    if (skipFirstNarrationRef.current) {
      skipFirstNarrationRef.current = false;
    }
    const district = getDistrictType(mapX, mapY);
    pushNarration(getNarratorTextForDistrict(district, timeOfDay));
    return () => {
      if (narratorTimeoutRef.current) {
        window.clearTimeout(narratorTimeoutRef.current);
        narratorTimeoutRef.current = null;
      }
    };
  }, [mapX, mapY, timeOfDay, pushNarration]);

  return {
    narratorMessage,
    narratorKey,
    narratorHistory,
    narratorOpen,
    setNarratorOpen
  };
};
