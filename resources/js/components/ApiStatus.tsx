import { useApiHealth } from '../hooks/useApiHealth.ts';
import type { HealthState } from '../types/index.ts';

const tones: Record<HealthState, string> = {
  pending: 'bg-amber-50 text-amber-950 ring-amber-200',
  connected: 'bg-emerald-50 text-emerald-950 ring-emerald-200',
  unavailable: 'bg-rose-50 text-rose-950 ring-rose-200',
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
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${tones[state]}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {labels[state]}
    </p>
  );
}
