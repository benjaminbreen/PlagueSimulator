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
  const timeOfDayRef = useRef(timeOfDay);

  // Keep timeOfDay ref updated for use in narration text
  timeOfDayRef.current = timeOfDay;

  const pushNarration = useCallback((text: string) => {
    setNarratorMessage(text);
    // Avoid duplicate consecutive entries
    setNarratorHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === text) {
        return prev;
      }
      // Limit history to last 20 entries to prevent endless growth
      const newHistory = [...prev, text];
      return newHistory.slice(-20);
    });
    setNarratorKey((prev) => prev + 1);
    if (narratorTimeoutRef.current) {
      window.clearTimeout(narratorTimeoutRef.current);
    }
    narratorTimeoutRef.current = window.setTimeout(() => setNarratorMessage(null), 10000);
  }, []);

  // Only trigger narration when location changes, not on every timeOfDay change
  useEffect(() => {
    if (skipFirstNarrationRef.current) {
      skipFirstNarrationRef.current = false;
    }
    const district = getDistrictType(mapX, mapY);
    pushNarration(getNarratorTextForDistrict(district, timeOfDayRef.current));
    return () => {
      if (narratorTimeoutRef.current) {
        window.clearTimeout(narratorTimeoutRef.current);
        narratorTimeoutRef.current = null;
      }
    };
  }, [mapX, mapY, pushNarration]);

  return {
    narratorMessage,
    narratorKey,
    narratorHistory,
    narratorOpen,
    setNarratorOpen
  };
};
