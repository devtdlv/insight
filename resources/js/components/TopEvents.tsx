import { useId } from 'react';
import { formatCount, formatShare } from '../lib/analytics.ts';
import type { AnalyticsTopEvent } from '../types/analytics.ts';
import { Card } from './Card.tsx';

/**
 * Most frequent events, in the order the backend supplies (count descending,
 * then name ascending). Names are rendered as plain text with their case kept.
 *
 * Each share is a share of all events in the period, so the bars are not
 * scaled to the top event and the listed events need not add up to 100%.
 */
export function TopEvents({
  events,
  heading = 'Top events',
}: {
  events: AnalyticsTopEvent[];
  heading?: string;
}) {
  const headingId = useId();

  return (
    <Card className="min-w-0">
      <section aria-labelledby={headingId}>
        <h3 id={headingId} className="text-base font-semibold text-ink">
          {heading}
        </h3>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No events in this period yet.
          </p>
        ) : (
          <>
            <ol className="mt-4 space-y-4">
              {events.map((event) => {
                const percent = Math.min(
                  100,
                  Math.max(
                    0,
                    Number.isFinite(event.share) ? event.share * 100 : 0,
                  ),
                );

                return (
                  <li key={event.name} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        title={event.name}
                        className="min-w-0 text-sm font-medium break-all text-ink"
                      >
                        {event.name}
                      </span>
                      <span className="shrink-0 text-sm text-muted tabular-nums">
                        {formatCount(event.count)}
                        <span aria-hidden="true"> · </span>
                        <span className="sr-only">, </span>
                        {formatShare(event.share)}
                        <span className="sr-only"> of all events</span>
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"
                    >
                      <div
                        data-testid="share-bar"
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${percent === 0 ? 0 : Math.max(percent, 1)}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs leading-5 text-muted">
              Shares are a percentage of all events in the period.
            </p>
          </>
        )}
      </section>
    </Card>
  );
}
