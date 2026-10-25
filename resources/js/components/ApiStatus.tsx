import { useApiHealth } from '../hooks/useApiHealth.ts';
import type { HealthState } from '../types/index.ts';

const tones: Record<HealthState, string> = {
  pending: 'bg-warning-soft text-warning',
  connected: 'bg-success-soft text-success',
  unavailable: 'bg-danger-soft text-danger',
};

const labels: Record<HealthState, string> = {
  pending: 'Checking API',
  connected: 'API connected',
  unavailable: 'API unavailable',
};

export function ApiStatus() {
  const state = useApiHealth();

  return (
    <p
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[state]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {labels[state]}
    </p>
  );
}
