import { useEffect, useRef, useState } from 'react';

export type OverworldPathNode = {
  mapX: number;
  mapY: number;
  enteredAtSimTime: number;
};

const MAX_PATH_LENGTH = 240;

export const useOverworldPath = (mapX: number, mapY: number, simTime: number) => {
  const [path, setPath] = useState<OverworldPathNode[]>([]);
  const lastRef = useRef<{ mapX: number; mapY: number } | null>(null);

  useEffect(() => {
    const last = lastRef.current;
    if (last && last.mapX === mapX && last.mapY === mapY) return;
    lastRef.current = { mapX, mapY };
    setPath((prev) => {
      const next = prev.concat([{ mapX, mapY, enteredAtSimTime: simTime }]);
      if (next.length <= MAX_PATH_LENGTH) return next;
      return next.slice(next.length - MAX_PATH_LENGTH);
    });
  }, [mapX, mapY, simTime]);

  return path;
};
