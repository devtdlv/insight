import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * True while an Inertia visit that reloads the `analytics` prop is in flight.
 * Other visits (navigation to another page) are ignored.
 */
export function useAnalyticsPending(): boolean {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const offStart = router.on('start', (event) => {
      const only = event.detail.visit.only;

      if (Array.isArray(only) && only.includes('analytics')) {
        setPending(true);
      }
    });
    const offFinish = router.on('finish', () => setPending(false));

    return () => {
      offStart();
      offFinish();
    };
  }, []);

  return pending;
}
