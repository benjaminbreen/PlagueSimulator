import { useEffect, useRef } from 'react';
import { AgentState, PlagueStatus } from '../types';
import { getPlagueTypeLabel } from '../utils/plague';

interface UsePlagueMonitorOptions {
  plague: PlagueStatus;
  onShowInfectedModal: () => void;
  onNotify: (message: string) => void;
  onDeath: (summary: { reason: string; description: string }) => void;
}

export function usePlagueMonitor({
  plague,
  onShowInfectedModal,
  onNotify,
  onDeath
}: UsePlagueMonitorOptions) {
  const prevPlagueStateRef = useRef(plague.state);
  const prevSymptomsRef = useRef({
    fever: 0,
    buboes: 0,
    coughingBlood: 0,
    skinBleeding: 0,
    delirium: 0,
    gangrene: 0
  });

  useEffect(() => {
    const prevState = prevPlagueStateRef.current;
    const currState = plague.state;

    if (prevState !== currState) {
      if (prevState === AgentState.HEALTHY && currState === AgentState.INCUBATING) {
        onShowInfectedModal();
      }

      if (currState === AgentState.DECEASED) {
        const plagueTypeName = getPlagueTypeLabel(plague.plagueType).toLowerCase();
        onDeath({
          reason: 'Claimed by the Pestilence',
          description: `After ${plague.daysInfected} days of suffering, the ${plagueTypeName} plague has claimed your life. Your body joins the countless others in the streets of Damascus, another victim of the Great Mortality.`
        });
      }

      prevPlagueStateRef.current = currState;
    }

    if (currState === AgentState.INFECTED) {
      const prev = prevSymptomsRef.current;
      const THRESHOLD = 40;

      if (plague.fever >= THRESHOLD && prev.fever < THRESHOLD) {
        onNotify('A burning fever consumes you...');
      } else if (plague.buboes >= THRESHOLD && prev.buboes < THRESHOLD) {
        const location = plague.buboLocation === 1 ? 'groin' : plague.buboLocation === 2 ? 'armpit' : 'neck';
        onNotify(`Painful swellings appear in your ${location}...`);
      } else if (plague.coughingBlood >= THRESHOLD && prev.coughingBlood < THRESHOLD) {
        onNotify('You begin coughing blood...');
      } else if (plague.skinBleeding >= THRESHOLD && prev.skinBleeding < THRESHOLD) {
        onNotify('Dark patches of bleeding appear beneath your skin...');
      } else if (plague.delirium >= THRESHOLD && prev.delirium < THRESHOLD) {
        onNotify('Your mind grows clouded with fever dreams...');
      } else if (plague.gangrene >= THRESHOLD && prev.gangrene < THRESHOLD) {
        onNotify('Your extremities begin to blacken...');
      }

      prevSymptomsRef.current = {
        fever: plague.fever,
        buboes: plague.buboes,
        coughingBlood: plague.coughingBlood,
        skinBleeding: plague.skinBleeding,
        delirium: plague.delirium,
        gangrene: plague.gangrene
      };
    }
  }, [onDeath, onNotify, onShowInfectedModal, plague]);
}
