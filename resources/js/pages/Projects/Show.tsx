import { Link, usePage } from '@inertiajs/react';
import { ActivityChart } from '../../components/ActivityChart.tsx';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { DateRangeSelector } from '../../components/DateRangeSelector.tsx';
import { MetricCard } from '../../components/MetricCard.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectSectionNav } from '../../components/ProjectSectionNav.tsx';
import { TopEvents } from '../../components/TopEvents.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import {
  compareMetric,
  formatCount,
  formatRatio,
  hasComparisonWindow,
  isAnalyticsData,
} from '../../lib/analytics.ts';
import { buttonClass } from '../../lib/buttonStyles.ts';
import { paths } from '../../lib/paths.ts';
import { useAnalyticsPending } from '../../lib/useAnalyticsPending.ts';
import type {
  AnalyticsMetricSet,
  AnalyticsRangeErrors,
  ProjectAnalyticsData,
} from '../../types/analytics.ts';
import type { ProjectSummary, WorkspaceDetail } from '../../types/index.ts';

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ratio(metrics: AnalyticsMetricSet): number | null {
  const value = metrics.eventsPerVisitor;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rangeErrors(errors: unknown): AnalyticsRangeErrors {
  const source =
    typeof errors === 'object' && errors !== null
      ? (errors as Record<string, unknown>)
      : {};
  const pick = (key: string) =>
    typeof source[key] === 'string' ? (source[key] as string) : undefined;

  return { range: pick('range'), from: pick('from'), to: pick('to') };
}

/** Describes the comparison window without promising identical elapsed hours. */
function comparisonNote(analytics: ProjectAnalyticsData): string {
  if (!hasComparisonWindow(analytics)) {
    return 'There is no earlier period to compare with for this range.';
  }

  if (analytics.range.preset === '24h') {
    return 'Changes compare with the previous 24 hours.';
  }

  if (analytics.range.inProgress) {
    return 'This range includes today, so changes compare with the equivalent preceding period up to the same local clock time.';
  }

  return 'Changes compare with the equivalent preceding period.';
}

function Metrics({ analytics }: { analytics: ProjectAnalyticsData }) {
  const comparable = hasComparisonWindow(analytics);
  const current = analytics.current;
  const previous = analytics.previous;
  const previousText = (value: number) =>
    comparable ? formatCount(value) : undefined;

  const currentRatio = ratio(current);
  const previousRatio = ratio(previous);

  return (
    <section aria-label="Key metrics">
      <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        <MetricCard
          label="Total events"
          value={formatCount(finite(current.totalEvents))}
          comparison={compareMetric(
            finite(current.totalEvents),
            finite(previous.totalEvents),
            comparable,
          )}
          previousValue={previousText(finite(previous.totalEvents))}
          previousNumber={finite(previous.totalEvents)}
          description="Every event received in this period."
        />
        <MetricCard
          label="Unique visitors"
          value={formatCount(finite(current.uniqueVisitors))}
          comparison={compareMetric(
            finite(current.uniqueVisitors),
            finite(previous.uniqueVisitors),
            comparable,
          )}
          previousValue={previousText(finite(previous.uniqueVisitors))}
          previousNumber={finite(previous.uniqueVisitors)}
          description="Distinct visitors who sent events."
        />
        <MetricCard
          label="Identified users"
          value={formatCount(finite(current.identifiedUsers))}
          comparison={compareMetric(
            finite(current.identifiedUsers),
            finite(previous.identifiedUsers),
            comparable,
          )}
          previousValue={previousText(finite(previous.identifiedUsers))}
          previousNumber={finite(previous.identifiedUsers)}
          description="Distinct users your app identified."
        />
        <MetricCard
          label="Events per visitor"
          value={currentRatio === null ? null : formatRatio(currentRatio)}
          unavailableText="No visitors"
          comparison={compareMetric(currentRatio, previousRatio, comparable)}
          previousValue={
            comparable && previousRatio !== null
              ? formatRatio(previousRatio)
              : undefined
          }
          previousNumber={previousRatio}
          format={formatRatio}
          description="Average events for each unique visitor."
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {comparisonNote(analytics)}
      </p>
    </section>
  );
}

function EmptyPeriod({
  workspaceId,
  projectId,
  previousHadEvents,
}: {
  workspaceId: number;
  projectId: number;
  previousHadEvents: boolean;
}) {
  return (
    <Card>
      <section aria-labelledby="empty-period-title">
        <h3
          id="empty-period-title"
          className="text-base font-semibold text-ink"
        >
          No events in this period
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {previousHadEvents
            ? 'Events were recorded in the previous period, but none in this one. Try a wider date range.'
            : 'No events were found in this range or the one before it. Events from other dates are not included, so try a wider range. A quiet period is normal. Recent events shows the latest activity, and Tracking setup helps if you have not sent events yet.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={paths.projectEvents(workspaceId, projectId)}
            className={buttonClass('secondary')}
          >
            View recent events
          </Link>
          <Link
            href={paths.projectTracking(workspaceId, projectId)}
            className={buttonClass('secondary')}
          >
            Tracking setup
          </Link>
        </div>
      </section>
    </Card>
  );
}

function Unavailable({
  workspaceId,
  projectId,
}: {
  workspaceId: number;
  projectId: number;
}) {
  return (
    <Card>
      <div role="alert">
        <h2 className="text-lg font-semibold text-ink">
          Analytics are unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The analytics for this project could not be loaded. Reload the page to
          try again.
        </p>
        <Link
          href={paths.project(workspaceId, projectId)}
          className={`${buttonClass('secondary')} mt-4`}
        >
          Reload overview
        </Link>
      </div>
    </Card>
  );
}

function ProjectShow({
  workspace,
  project,
  analytics,
}: {
  workspace: WorkspaceDetail;
  project: ProjectSummary;
  analytics?: unknown;
}) {
  const page = usePage();
  const pending = useAnalyticsPending();
  const errors = rangeErrors(page.props.errors);
  const data = isAnalyticsData(analytics) ? analytics : null;

  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title={project.name}
        description="Event activity, visitors, and top events for this project."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <ProjectSectionNav
        workspaceId={workspace.id}
        projectId={project.id}
        canManage={project.canManage}
        current="overview"
      />

      {data === null ? (
        <Unavailable workspaceId={workspace.id} projectId={project.id} />
      ) : (
        <>
          <Card>
            <DateRangeSelector
              workspaceId={workspace.id}
              projectId={project.id}
              timezone={project.timezone}
              range={data.range}
              errors={errors}
            />
            <p
              role="status"
              className="mt-2 h-5 text-sm text-muted"
              data-testid="analytics-status"
            >
              {pending ? 'Updating analytics...' : ''}
            </p>
          </Card>

          <div
            aria-busy={pending}
            data-testid="analytics-results"
            className={`@container space-y-6 motion-safe:transition-opacity ${
              pending ? 'opacity-60' : ''
            }`}
          >
            <Metrics analytics={data} />
            {finite(data.current.totalEvents) === 0 ? (
              <EmptyPeriod
                workspaceId={workspace.id}
                projectId={project.id}
                previousHadEvents={finite(data.previous.totalEvents) > 0}
              />
            ) : (
              <div className="grid gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <ActivityChart
                  buckets={data.activity}
                  granularity={data.range.granularity}
                  heading="Event activity"
                  description={`Events per ${
                    data.range.granularity === 'hour' ? 'hour' : 'day'
                  } in ${data.range.timezone} time.`}
                />
                <TopEvents events={data.topEvents} />
              </div>
            )}
          </div>
        </>
      )}

      <Card>
        <h2 className="text-base font-semibold text-ink">About this project</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
          <Badge tone="neutral">{project.timezone}</Badge>
        </div>
        {project.description ? (
          <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-muted">
            {project.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">No description yet.</p>
        )}
        {project.websiteUrl ? (
          <p className="mt-4 text-sm break-all">
            <a
              href={project.websiteUrl}
              className="font-semibold text-accent underline-offset-4 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              {project.websiteUrl}
            </a>
          </p>
        ) : null}
        {project.canManage ? (
          <Link
            href={paths.projectSettings(workspace.id, project.id)}
            className={`${buttonClass('secondary')} mt-6`}
          >
            Project settings
          </Link>
        ) : null}
      </Card>
    </>
  );
}

appPage(ProjectShow, (props) => props.project.name);

export default ProjectShow;
