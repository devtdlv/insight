import { router } from '@inertiajs/react';
import { useId, useState, type SyntheticEvent } from 'react';
import {
  formatRangeLabel,
  normalizePreset,
  PRESET_LABELS,
} from '../lib/analytics.ts';
import {
  MAX_RANGE_DAYS,
  todayInTimezone,
  validateCustomRange,
} from '../lib/dateRange.ts';
import { paths } from '../lib/paths.ts';
import type {
  AnalyticsPreset,
  AnalyticsRange,
  AnalyticsRangeErrors,
} from '../types/analytics.ts';
import { buttonClass } from '../lib/buttonStyles.ts';

const PRESET_ORDER: AnalyticsPreset[] = ['24h', '7d', '30d', '90d', 'custom'];

type Draft = { preset: AnalyticsPreset; from: string; to: string };

function draftFrom(range: AnalyticsRange): Draft {
  return {
    preset: normalizePreset(range.preset),
    from: range.localFrom,
    to: range.localTo,
  };
}

function rangeKey(range: AnalyticsRange): string {
  return `${range.preset}|${range.localFrom}|${range.localTo}`;
}

/**
 * Date range picker for the project overview analytics.
 *
 * `range` is the range the server actually used (analytics.range). It is the
 * source of truth for what is shown. The selector keeps a draft of what the
 * user picked and follows `range` whenever it changes (including browser
 * back/forward), except while the server reports validation `errors`, when the
 * draft is kept so the user can correct it. Results are always labelled with
 * the real range, so a failed request cannot leave the page mislabelled.
 *
 * Changes go through `router.get(projects.show, query, { only: ['analytics'] })`.
 * Date boundaries use the project timezone, not the browser timezone.
 *
 * Parent usage: pass `analytics.range` and the page's `errors` prop.
 */
export function DateRangeSelector({
  workspaceId,
  projectId,
  timezone,
  range,
  errors = {},
  getNow = () => new Date(),
}: {
  workspaceId: number;
  projectId: number;
  /** Project IANA timezone. */
  timezone: string;
  range: AnalyticsRange;
  /** Laravel validation messages for range, from and to. */
  errors?: AnalyticsRangeErrors;
  /** Clock override for tests. */
  getNow?: () => Date;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(range));
  const [syncedKey, setSyncedKey] = useState(() => rangeKey(range));
  const [localErrors, setLocalErrors] = useState<AnalyticsRangeErrors>({});
  const [busy, setBusy] = useState(false);
  const [today] = useState(() => todayInTimezone(timezone, getNow()));

  const hasServerErrors = Object.values(errors).some(Boolean);
  const currentKey = rangeKey(range);

  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey);

    if (!hasServerErrors) {
      setDraft(draftFrom(range));
      setLocalErrors({});
    }
  }

  const shown: AnalyticsRangeErrors = {
    range: localErrors.range ?? errors.range,
    from: localErrors.from ?? errors.from,
    to: localErrors.to ?? errors.to,
  };

  function visit(query: Record<string, string>) {
    setBusy(true);
    router.get(paths.project(workspaceId, projectId), query, {
      only: ['analytics'],
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setBusy(false),
    });
  }

  function choosePreset(preset: AnalyticsPreset) {
    setDraft((current) => ({ ...current, preset }));
    setLocalErrors({});

    if (preset === 'custom') {
      return;
    }

    if (preset === range.preset && !hasServerErrors) {
      return;
    }

    visit({ range: preset });
  }

  function applyCustom(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.preset !== 'custom') {
      return;
    }

    const problems = validateCustomRange(
      draft.from,
      draft.to,
      todayInTimezone(timezone, getNow()),
    );

    setLocalErrors(problems);

    if (problems.from || problems.to) {
      return;
    }

    visit({ range: 'custom', from: draft.from, to: draft.to });
  }

  function describedBy(...ids: Array<string | false>) {
    return ids.filter(Boolean).join(' ') || undefined;
  }

  const rangeErrorId = `${id}-range-error`;
  const fromErrorId = `${id}-from-error`;
  const toErrorId = `${id}-to-error`;
  const hintId = `${id}-hint`;
  const inputClass = (error?: string) =>
    `mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 text-base text-ink shadow-[var(--shadow)] ${
      error ? 'border-danger' : 'border-line'
    }`;

  return (
    <form
      onSubmit={applyCustom}
      noValidate
      aria-busy={busy}
      className="space-y-4"
    >
      <fieldset aria-describedby={describedBy(!!shown.range && rangeErrorId)}>
        <legend className="text-sm font-medium text-ink">Date range</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_ORDER.map((preset) => (
            <label key={preset} className="relative">
              <input
                type="radio"
                name={`${id}-range`}
                value={preset}
                checked={draft.preset === preset}
                onChange={() => choosePreset(preset)}
                className="peer sr-only"
              />
              <span className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:bg-surface-muted">
                {PRESET_LABELS[preset]}
              </span>
            </label>
          ))}
        </div>
        {shown.range ? (
          <p
            id={rangeErrorId}
            role="alert"
            className="mt-2 text-sm text-danger"
          >
            {shown.range}
          </p>
        ) : null}
      </fieldset>

      {draft.preset === 'custom' ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
          <div>
            <label
              htmlFor={`${id}-from`}
              className="block text-sm font-medium text-ink"
            >
              From
            </label>
            <input
              id={`${id}-from`}
              name="from"
              type="date"
              value={draft.from}
              max={today}
              aria-invalid={shown.from ? true : undefined}
              aria-describedby={describedBy(
                hintId,
                !!shown.from && fromErrorId,
              )}
              onChange={(event) => {
                setDraft({ ...draft, from: event.target.value });
                setLocalErrors({ ...localErrors, from: undefined });
              }}
              className={inputClass(shown.from)}
            />
            {shown.from ? (
              <p
                id={fromErrorId}
                role="alert"
                className="mt-2 text-sm text-danger"
              >
                {shown.from}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor={`${id}-to`}
              className="block text-sm font-medium text-ink"
            >
              To
            </label>
            <input
              id={`${id}-to`}
              name="to"
              type="date"
              value={draft.to}
              max={today}
              aria-invalid={shown.to ? true : undefined}
              aria-describedby={describedBy(hintId, !!shown.to && toErrorId)}
              onChange={(event) => {
                setDraft({ ...draft, to: event.target.value });
                setLocalErrors({ ...localErrors, to: undefined });
              }}
              className={inputClass(shown.to)}
            />
            {shown.to ? (
              <p
                id={toErrorId}
                role="alert"
                className="mt-2 text-sm text-danger"
              >
                {shown.to}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={busy}
            className={buttonClass('primary', 'sm:mt-7')}
          >
            Apply
          </button>
          <p id={hintId} className="text-sm leading-5 text-muted sm:col-span-3">
            Up to {MAX_RANGE_DAYS} days, ending no later than today. Dates use
            the project timezone, {timezone}.
          </p>
        </div>
      ) : null}

      <p aria-live="polite" className="text-sm text-muted">
        Showing{' '}
        <span className="font-semibold text-ink">
          {formatRangeLabel(range)}
        </span>
        <span> · {timezone}</span>
      </p>
    </form>
  );
}
