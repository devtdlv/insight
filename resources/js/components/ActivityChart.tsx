import { useId, useState } from 'react';
import { formatCompactCount, formatCount } from '../lib/analytics.ts';
import {
  coord,
  niceScale,
  safeCount,
  uniqueLabels,
  xTicks,
} from '../lib/activityChart.ts';
import type {
  AnalyticsActivityBucket,
  AnalyticsGranularity,
} from '../types/analytics.ts';
import { Card } from './Card.tsx';

const WIDTH = 560;
const HEIGHT = 280;
const TOP = 16;
const RIGHT = 28;
const BOTTOM = 52;
const MAX_POINT_MARKERS = 31;

/**
 * Native SVG activity chart: events per backend bucket.
 *
 * Buckets are drawn in the order given, one evenly spaced position per bucket
 * (an ordinal axis), so 23 and 25 hour days, repeated fall-back hours and
 * skipped spring-forward hours cannot distort or merge anything. Labels and
 * partial flags come from the backend. The chart never builds dates or buckets.
 *
 * A dashed line and a hollow marker show partial buckets. A visually hidden
 * table lists every bucket for assistive technology. The chart is static, so
 * there is no motion to reduce and nothing depends on hover.
 */
export function ActivityChart({
  buckets,
  granularity,
  heading = 'Activity',
  description = 'Number of events in each period.',
}: {
  buckets: AnalyticsActivityBucket[];
  /** Optional hint. When omitted it is inferred from the backend labels. */
  granularity?: AnalyticsGranularity;
  heading?: string;
  description?: string;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const svgTitleId = `${id}-svg-title`;
  const tableId = `${id}-table`;
  const [showTable, setShowTable] = useState(false);

  if (buckets.length === 0) {
    return (
      <Card className="min-w-0">
        <section aria-labelledby={titleId}>
          <h3 id={titleId} className="text-base font-semibold text-ink">
            {heading}
          </h3>
          <p className="mt-3 text-sm text-muted">
            No activity data for this period.
          </p>
        </section>
      </Card>
    );
  }

  const counts = buckets.map((bucket) => safeCount(bucket.count));
  const labels = uniqueLabels(buckets);
  const hourly = granularity
    ? granularity === 'hour'
    : buckets.some((bucket) => bucket.label.includes(':'));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const peakIndex = counts.reduce(
    (best, count, index) => (count > counts[best] ? index : best),
    0,
  );
  const hasPartial = buckets.some((bucket) => bucket.partial);

  const { top, step } = niceScale(Math.max(...counts));
  const yTicks: number[] = [];
  for (let value = 0; value <= top; value += step) {
    yTicks.push(value);
  }

  const widestTick = Math.max(
    ...yTicks.map((value) => formatCompactCount(value).length),
  );
  const left = Math.max(40, 14 + 7.5 * widestTick);
  const plotWidth = WIDTH - left - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) =>
    coord(
      buckets.length === 1
        ? left + plotWidth / 2
        : left + (index * plotWidth) / (buckets.length - 1),
    );
  const y = (count: number) =>
    coord(TOP + plotHeight - (count / top) * plotHeight);
  const baseline = coord(TOP + plotHeight);

  const solid: string[] = [];
  const dashed: string[] = [];
  for (let index = 1; index < buckets.length; index += 1) {
    const segment = `M${x(index - 1)} ${y(counts[index - 1])}L${x(index)} ${y(counts[index])}`;
    const partial = buckets[index - 1].partial || buckets[index].partial;

    (partial ? dashed : solid).push(segment);
  }

  const area =
    buckets.length > 1
      ? `M${x(0)} ${baseline}${counts
          .map((count, index) => `L${x(index)} ${y(count)}`)
          .join('')}L${x(buckets.length - 1)} ${baseline}Z`
      : null;

  const showMarkers = buckets.length <= MAX_POINT_MARKERS;
  const ticks = xTicks(buckets, hourly);
  const summary =
    total === 0
      ? 'No events were recorded in this period.'
      : `${formatCount(total)} ${total === 1 ? 'event' : 'events'} in total. Busiest: ${labels[peakIndex]}, ${formatCount(counts[peakIndex])}.`;
  const accessibleSummary = `${buckets.length} ${buckets.length === 1 ? 'period' : 'periods'}, from ${labels[0]} to ${labels[labels.length - 1]}. ${summary}`;

  return (
    <Card className="min-w-0">
      <section aria-labelledby={titleId}>
        <h3 id={titleId} className="text-base font-semibold text-ink">
          {heading}
        </h3>
        <p id={descId} className="mt-1 text-sm leading-5 text-muted">
          {description}
        </p>

        <div
          role="group"
          tabIndex={0}
          aria-label={`${heading} chart, scrollable`}
          className="mt-4 overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg
            role="img"
            aria-labelledby={`${titleId} ${svgTitleId}`}
            aria-describedby={descId}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full min-w-[480px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <title id={svgTitleId}>{accessibleSummary}</title>

            {yTicks.map((value) => (
              <g key={value}>
                <line
                  x1={left}
                  x2={WIDTH - RIGHT}
                  y1={y(value)}
                  y2={y(value)}
                  className="stroke-line"
                  strokeWidth={1}
                />
                <text
                  data-axis="y"
                  x={coord(left - 8)}
                  y={coord(y(value) + 4)}
                  textAnchor="end"
                  className="fill-muted text-[11px]"
                >
                  {formatCompactCount(value)}
                </text>
              </g>
            ))}

            {area ? <path d={area} className="fill-accent/15" /> : null}
            {solid.length ? (
              <path
                data-line="solid"
                d={solid.join('')}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-accent"
              />
            ) : null}
            {dashed.length ? (
              <path
                data-line="partial"
                d={dashed.join('')}
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
                className="stroke-accent"
              />
            ) : null}

            {buckets.map((bucket, index) =>
              showMarkers || bucket.partial ? (
                <circle
                  key={bucket.key}
                  data-point={bucket.partial ? 'partial' : 'complete'}
                  cx={x(index)}
                  cy={y(counts[index])}
                  r={bucket.partial ? 4 : 3}
                  strokeWidth={2}
                  className={
                    bucket.partial
                      ? 'fill-surface stroke-accent'
                      : 'fill-accent stroke-accent'
                  }
                />
              ) : null,
            )}

            {ticks.map((tick) => (
              <text
                key={buckets[tick.index].key}
                data-axis="x"
                x={x(tick.index)}
                y={baseline + 18}
                textAnchor="middle"
                className="fill-muted text-[11px]"
              >
                {tick.lines.map((line, lineIndex) => (
                  <tspan
                    key={line}
                    x={x(tick.index)}
                    dy={lineIndex === 0 ? 0 : 14}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            ))}
          </svg>
        </div>

        <p className="mt-3 text-sm text-ink">{summary}</p>
        {hasPartial ? (
          <p className="mt-1 text-xs leading-5 text-muted">
            Dashed line and hollow marker: a partial period that is still in
            progress or does not cover a full hour or day.
          </p>
        ) : null}

        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((value) => !value)}
          className="mt-3 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {showTable ? 'Hide data table' : 'Show data table'}
        </button>

        <div
          className={
            showTable
              ? 'mt-3 max-h-72 overflow-auto rounded-lg border border-line'
              : 'sr-only'
          }
        >
          <table
            id={tableId}
            className={
              showTable
                ? 'w-full text-left text-sm text-ink [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_thead]:bg-surface-muted [&_tr]:border-b [&_tr]:border-line'
                : undefined
            }
          >
            <caption
              className={showTable ? 'sr-only' : undefined}
            >{`${heading} data`}</caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Events</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket, index) => (
                <tr key={bucket.key}>
                  <th scope="row">{labels[index]}</th>
                  <td>{formatCount(counts[index])}</td>
                  <td>
                    {bucket.partial ? 'Partial period' : 'Complete period'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Card>
  );
}
