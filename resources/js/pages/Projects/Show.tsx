import { Link } from '@inertiajs/react';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { AppLayout } from '../../layouts/AppLayout.tsx';
import { buttonClass } from '../../lib/buttonStyles.ts';
import { paths } from '../../lib/paths.ts';
import type { ProjectSummary, WorkspaceDetail } from '../../types/index.ts';

export default function ProjectShow({
  workspace,
  project,
}: {
  workspace: WorkspaceDetail;
  project: ProjectSummary;
}) {
  return (
    <AppLayout title={project.name}>
      <PageHeader
        eyebrow={workspace.name}
        title={project.name}
        description="This project does not show product metrics. Events, funnels, and retention are coming later."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <Card>
        <div className="flex flex-wrap items-center gap-2">
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
          <p className="mt-4 text-sm">
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
      <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-10 text-center">
        <p className="text-sm font-semibold text-ink">No chart</p>
        <p className="mt-1 text-sm text-muted">
          A chart will appear here after events are collected.
        </p>
      </div>
    </AppLayout>
  );
}
