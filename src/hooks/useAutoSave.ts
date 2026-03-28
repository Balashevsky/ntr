import { useEffect, useRef } from 'react';
import { persistState } from '../store/persistence';
import { AUTO_SAVE_INTERVAL_MS } from '../utils/constants';

export function useAutoSave() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      persistState().catch((err) => console.error('Auto-save failed:', err));
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
