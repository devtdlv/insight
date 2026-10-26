import { Link } from '@inertiajs/react';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { buttonClass, textLinkClass } from '../../lib/buttonStyles.ts';
import { paths } from '../../lib/paths.ts';
import type { ProjectSummary, WorkspaceDetail } from '../../types/index.ts';

function ProjectIndex({
  workspace,
  projects,
}: {
  workspace: WorkspaceDetail;
  projects: ProjectSummary[];
}) {
  const active = projects.filter((project) => project.archivedAt === null);
  const archived = projects.filter((project) => project.archivedAt !== null);

  return (
    <>
      <PageHeader
        eyebrow={workspace.name}
        title="Projects"
        description="Projects are the websites or applications in this workspace. They do not show product metrics yet."
      />
      <WorkspaceNav workspace={workspace} current="projects" />
      {workspace.canManage ? (
        <div>
          <Link
            href={paths.projectCreate(workspace.id)}
            className={buttonClass('primary')}
          >
            Create a project
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Owners and admins can add projects. Members can view them.
        </p>
      )}
      {active.length === 0 ? (
        <EmptyState
          title="No active projects"
          description="When a project exists, its overview will live here. Event collection is still unavailable."
        />
      ) : (
        <ul className="grid gap-3">
          {active.map((project) => (
            <li key={project.id}>
              <ProjectRow workspaceId={workspace.id} project={project} />
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl text-ink">Archived</h2>
          <ul className="grid gap-3">
            {archived.map((project) => (
              <li key={project.id}>
                <ProjectRow workspaceId={workspace.id} project={project} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

appPage(ProjectIndex, (props) => `${props.workspace.name} projects`);

export default ProjectIndex;

function ProjectRow({
  workspaceId,
  project,
}: {
  workspaceId: number;
  project: ProjectSummary;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg text-ink">{project.name}</h2>
        {project.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
      </div>
      {project.description ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          {project.description}
        </p>
      ) : null}
      <Link
        href={paths.project(workspaceId, project.id)}
        className={`${textLinkClass} mt-3 inline-flex`}
      >
        Open project
      </Link>
    </Card>
  );
}
