import {
  describeComparison,
  formatCount,
  type Comparison,
} from '../lib/analytics.ts';

/**
 * Neutral comparison indicator. It reports direction and size only. It never
 * implies that an increase is good or a decrease is bad.
 *
 * The arrow and text are visible; screen readers get the full sentence.
 */
export function DeltaBadge({
  comparison,
  previous,
  format = formatCount,
}: {
  comparison: Comparison;
  /** Previous-period value, mentioned in the screen reader description. */
  previous?: number | null;
  /** Formats absolute values (counts by default). */
  format?: (value: number) => string;
}) {
  const display = describeComparison(comparison, { format, previous });

  return (
    <span
      data-comparison={comparison.kind}
      className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-ink"
    >
      {display.arrow ? <span aria-hidden="true">{display.arrow}</span> : null}
      <span aria-hidden="true">{display.text}</span>
      <span className="sr-only">{display.description}</span>
    </span>
  );
}
