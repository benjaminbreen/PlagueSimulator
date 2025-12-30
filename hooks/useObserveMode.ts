import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraMode, SimulationParams } from '../types';
import { observeLines as defaultObserveLines } from '../components/observe/observeCopy';

interface ObserveDeps {
  params: SimulationParams;
  observePrompt: string;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  setShowEncounterModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMerchantModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEnterModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPlayerModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useObserveMode = ({
  params,
  observePrompt,
  setParams,
  setShowEncounterModal,
  setShowMerchantModal,
  setShowEnterModal,
  setShowPlayerModal
}: ObserveDeps) => {
  const [observeMode, setObserveMode] = useState(false);
  const [observeLineCount, setObserveLineCount] = useState(0);
  const observePrevRef = useRef<{ simSpeed: number; uiMinimized: boolean; cameraMode: CameraMode } | null>(null);
  const [observeLines, setObserveLines] = useState<string[]>([]);
  const requestAbortRef = useRef<AbortController | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const startObserveMode = useCallback(() => {
    if (observeMode) return;
    observePrevRef.current = {
      simSpeed: params.simulationSpeed,
      uiMinimized: params.uiMinimized,
      cameraMode: params.cameraMode
    };
    setParams(prev => ({
      ...prev,
      simulationSpeed: 0,
      uiMinimized: true,
      cameraMode: CameraMode.FIRST_PERSON
    }));
    setShowEncounterModal(false);
    setShowMerchantModal(false);
    setShowEnterModal(false);
    setShowPlayerModal(false);
    setObserveMode(true);
    setObserveLines([]);
    setObserveLineCount(0);

    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (observePrompt) {
      if (requestAbortRef.current) {
        requestAbortRef.current.abort();
      }
      const controller = new AbortController();
      requestAbortRef.current = controller;
      void (async () => {
        try {
          const response = await fetch('/api/observe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: observePrompt }),
            signal: controller.signal
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Observe API error:', response.status, errorText);
            return;
          }
          const data = await response.json();
          const text = typeof data?.text === 'string' ? data.text : '';
          if (!text) {
            console.warn('Observe API returned empty text');
          }
          const lines = text
            .split('\n')
            .map((line: string) => line.trim())
            .filter(Boolean)
            .slice(0, 6);
          if (lines.length > 0) {
            setObserveLines(lines);
          }
        } catch {
          // Ignore - fall back to default lines
        }
      })();
      fallbackTimerRef.current = window.setTimeout(() => {
        setObserveLines(prev => (prev.length === 0 ? defaultObserveLines : prev));
      }, 1200);
    } else {
      setObserveLines(defaultObserveLines);
    }
  }, [observeMode, params.simulationSpeed, params.uiMinimized, params.cameraMode, setParams, setShowEncounterModal, setShowMerchantModal, setShowEnterModal, setShowPlayerModal, observePrompt]);

  const stopObserveMode = useCallback(() => {
    if (!observeMode) return;
    const prev = observePrevRef.current;
    if (prev) {
      setParams(current => ({
        ...current,
        simulationSpeed: prev.simSpeed,
        uiMinimized: prev.uiMinimized,
        cameraMode: prev.cameraMode
      }));
    }
    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
      requestAbortRef.current = null;
    }
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setObserveMode(false);
    setObserveLineCount(0);
  }, [observeMode, setParams]);

  useEffect(() => {
    if (!observeMode) return;
    setObserveLineCount(0);
    let idx = 0;
    const interval = window.setInterval(() => {
      idx += 1;
      setObserveLineCount(Math.min(observeLines.length, idx));
      if (idx >= observeLines.length) {
        window.clearInterval(interval);
      }
    }, 1400);
    const timeout = window.setTimeout(() => {
      stopObserveMode();
    }, 1400 * observeLines.length + 6000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [observeMode, observeLines.length, stopObserveMode]);

  return {
    observeMode,
    observeLines,
    observeLineCount,
    startObserveMode,
    stopObserveMode
  };
};
