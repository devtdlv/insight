import { useEffect, useState } from 'react';
import { fetchHealth } from '../lib/health.ts';
import type { HealthState } from '../types/index.ts';

const REFRESH_INTERVAL_MS = 15_000;

export function useApiHealth(): HealthState {
  const [state, setState] = useState<HealthState>('pending');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    function apply(next: HealthState) {
      if (active) {
        setState(next);
      }
    }

    fetchHealth(controller.signal)
      .then(() => {
        apply('connected');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        apply('unavailable');
      });

    const interval = window.setInterval(() => {
      fetchHealth()
        .then(() => {
          apply('connected');
        })
        .catch(() => {
          apply('unavailable');
        });
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
