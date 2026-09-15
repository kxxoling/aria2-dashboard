import { useCallback, useRef, useState } from "react";

export const MAX_SPEED_SAMPLES = 180; // ~3 minutes at 1s cadence

export interface SpeedSample {
  down: number;
  up: number;
}

/**
 * Rolling speed history for the header sparkline and the speed chart.
 * Mutates a ref (no re-render per sample); consumers read `snapshot` which
 * bumps only when pushed from the polling effect (once per second).
 */
export function useSpeedHistory() {
  const samplesRef = useRef<SpeedSample[]>([]);
  const [, forceRender] = useState(0);
  const snapshot = samplesRef.current;

  const push = useCallback((down: number, up: number) => {
    samplesRef.current.push({ down, up });
    if (samplesRef.current.length > MAX_SPEED_SAMPLES) {
      samplesRef.current.shift();
    }
    forceRender((n) => n + 1);
  }, []);

  return { samples: snapshot, push };
}
