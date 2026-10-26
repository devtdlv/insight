import { useId } from 'react';
import type { Comparison } from '../lib/analytics.ts';
import { Card } from './Card.tsx';
import { DeltaBadge } from './DeltaBadge.tsx';

/**
 * One headline metric with a previous-period comparison.
 *
 * `value` and `previousValue` are already formatted strings. A null `value`
 * shows the unavailable state (for example events per visitor with no visitors).
 */
export function MetricCard({
  label,
  value,
  comparison,
  previousValue,
  previousNumber,
  format,
  description,
  unavailableText = 'Not available',
}: {
  label: string;
  value: string | null;
  comparison: Comparison;
  /** Formatted previous-period value, shown as text. Omit when unavailable. */
  previousValue?: string | null;
  /** Raw previous value, used in the screen reader description. */
  previousNumber?: number | null;
  /** Formats absolute differences in the badge. */
  format?: (value: number) => string;
  description?: string;
  unavailableText?: string;
}) {
  const labelId = useId();

  return (
    <Card className="min-w-0">
      <article aria-labelledby={labelId}>
        <h3 id={labelId} className="text-sm font-medium text-muted">
          {label}
        </h3>
        {value === null ? (
          <p className="mt-2 text-2xl font-semibold text-muted sm:text-3xl">
            {unavailableText}
          </p>
        ) : (
          <p className="mt-2 text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
            {value}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <DeltaBadge
            comparison={comparison}
            previous={previousNumber}
            format={format}
          />
          {previousValue ? (
            <span className="text-xs text-muted">
              Previous period: {previousValue}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-3 text-sm leading-5 text-muted">{description}</p>
        ) : null}
      </article>
    </Card>
  );
}
