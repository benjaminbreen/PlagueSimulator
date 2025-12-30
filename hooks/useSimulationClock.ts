import { useEffect } from 'react';
import { CONSTANTS, PlayerStats, SimulationParams, SimulationStats } from '../types';
import { progressPlague } from '../utils/plague';

interface SimulationClockArgs {
  simulationSpeed: number;
  simTimeRef: React.MutableRefObject<number>;
  timeOfDayRef: React.MutableRefObject<number>;
  lastSimCommitRef: React.MutableRefObject<number>;
  setStats: React.Dispatch<React.SetStateAction<SimulationStats>>;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
}

export const useSimulationClock = ({
  simulationSpeed,
  simTimeRef,
  timeOfDayRef,
  lastSimCommitRef,
  setStats,
  setParams,
  setPlayerStats
}: SimulationClockArgs) => {
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 10000;
      lastTime = now;

      if (simulationSpeed > 0) {
        const simHoursDelta = dt * simulationSpeed / CONSTANTS.REAL_SECONDS_PER_SIM_HOUR;
        simTimeRef.current += simHoursDelta;
        timeOfDayRef.current += simHoursDelta;
        if (timeOfDayRef.current >= 24) timeOfDayRef.current -= 24;

        const commitInterval = 0.1;
        if ((now - lastSimCommitRef.current) / 1000 >= commitInterval) {
          lastSimCommitRef.current = now;
          const nextSimTime = simTimeRef.current;
          const nextTimeOfDay = timeOfDayRef.current;
          setStats(prev => ({
            ...prev,
            simTime: nextSimTime,
            daysPassed: nextSimTime / 24,
          }));
          setParams(prev => ({
            ...prev,
            timeOfDay: nextTimeOfDay
          }));
          setPlayerStats(prevPlayer => ({
            ...prevPlayer,
            plague: progressPlague(prevPlayer.plague, nextSimTime)
          }));
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [lastSimCommitRef, setParams, setPlayerStats, setStats, simTimeRef, simulationSpeed, timeOfDayRef]);
};
