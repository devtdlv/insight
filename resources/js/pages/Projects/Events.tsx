import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Card } from '../../components/Card.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectSectionNav } from '../../components/ProjectSectionNav.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { paths } from '../../lib/paths.ts';
import type {
  ProjectSummary,
  StoredEvent,
  WorkspaceDetail,
} from '../../types/index.ts';

function ProjectEvents({
  workspace,
  project,
  events,
  previousPage,
  nextPage,
}: {
  workspace: WorkspaceDetail;
  project: Pick<
    ProjectSummary,
    'id' | 'name' | 'timezone' | 'archivedAt' | 'canManage'
  >;
  events: StoredEvent[];
  previousPage: number | null;
  nextPage: number | null;
}) {
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.reload({
      only: ['events', 'previousPage', 'nextPage'],
      onFinish: () => setRefreshing(false),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title="Recent events"
        description="These are events Insight has stored for this project. Totals, the activity chart, and top events are on the project overview."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <ProjectSectionNav
        workspaceId={workspace.id}
        projectId={project.id}
        canManage={project.canManage}
        current="events"
      />
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={refreshing}
          onClick={refresh}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Tracking starts when your application calls insight.track(). Insight does not invent sample events."
        />
      ) : (
        <ul className="grid gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-lg text-ink">{event.name}</h2>
                  <time
                    className="text-sm text-muted"
                    dateTime={event.occurredAt ?? undefined}
                  >
                    {formatWhen(event.occurredAt, project.timezone)}
                  </time>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Anonymous id{' '}
                  <span className="font-mono text-ink">
                    {event.anonymousId}
                  </span>
                </p>
                {event.identifiedUserId ? (
                  <p className="mt-1 text-sm text-muted">
                    Application user id{' '}
                    <span className="font-mono text-ink">
                      {event.identifiedUserId}
                    </span>
                  </p>
                ) : null}
                {event.properties ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">
                      Properties
                    </summary>
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-canvas p-3 text-sm leading-6 text-ink">
                      {JSON.stringify(event.properties, null, 2)}
                    </pre>
                  </details>
                ) : (
                  <p className="mt-4 text-sm text-muted">No properties</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {previousPage || nextPage ? (
        <nav aria-label="Event pages" className="flex gap-3">
          {previousPage ? (
            <Link
              href={`${paths.projectEvents(workspace.id, project.id)}?page=${previousPage}`}
              className="text-sm font-semibold text-accent"
            >
              Previous
            </Link>
          ) : null}
          {nextPage ? (
            <Link
              href={`${paths.projectEvents(workspace.id, project.id)}?page=${nextPage}`}
              className="text-sm font-semibold text-accent"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

appPage(ProjectEvents, (props) => `${props.project.name} events`);

export default ProjectEvents;

function formatWhen(value: string | null, timeZone: string): string {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone,
    }).format(date);
  } catch {
    return value;
  }
}
