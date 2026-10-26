import { Link } from '@inertiajs/react';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { ProjectSectionNav } from '../../components/ProjectSectionNav.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { buttonClass } from '../../lib/buttonStyles.ts';
import { paths } from '../../lib/paths.ts';
import type { ProjectSummary, WorkspaceDetail } from '../../types/index.ts';

function ProjectShow({
  workspace,
  project,
}: {
  workspace: WorkspaceDetail;
  project: ProjectSummary;
}) {
  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title={project.name}
        description="This project does not show aggregate metrics. Funnels and retention are coming later."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      <ProjectSectionNav
        workspaceId={workspace.id}
        projectId={project.id}
        canManage={project.canManage}
        current="overview"
      />
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
    </>
  );
}

appPage(ProjectShow, (props) => props.project.name);

export default ProjectShow;
