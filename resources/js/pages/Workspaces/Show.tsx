import { Link } from '@inertiajs/react';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { WorkspaceNav } from '../../components/WorkspaceNav.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { buttonClass, textLinkClass } from '../../lib/buttonStyles.ts';
import { paths, roleLabel } from '../../lib/paths.ts';
import type { WorkspaceDetail } from '../../types/index.ts';

function WorkspaceShow({
  workspace,
  projects,
  memberCount,
}: {
  workspace: WorkspaceDetail;
  projects: { id: number; name: string; archivedAt: string | null }[];
  memberCount: number;
}) {
  const active = projects.filter((project) => project.archivedAt === null);

  return (
    <>
      <PageHeader
        eyebrow={roleLabel(workspace.role)}
        title={workspace.name}
        description="This workspace does not show product metrics. Funnels and retention are coming later."
      />
      <WorkspaceNav workspace={workspace} current="overview" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Active projects</p>
          <p className="mt-2 text-3xl text-ink">{active.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Members</p>
          <p className="mt-2 text-3xl text-ink">{memberCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Your role</p>
          <p className="mt-3">
            <Badge>{roleLabel(workspace.role)}</Badge>
          </p>
        </Card>
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-ink">Projects</h2>
          {workspace.canManage ? (
            <Link
              href={paths.projectCreate(workspace.id)}
              className={buttonClass('primary')}
            >
              Create a project
            </Link>
          ) : null}
        </div>
        {active.length === 0 ? (
          <EmptyState
            title="No active projects"
            description="A project is a website or application in this workspace. Add one, then open Tracking to copy its write key."
          />
        ) : (
          <ul className="grid gap-3">
            {active.map((project) => (
              <li key={project.id}>
                <Card>
                  <h3 className="text-lg text-ink">{project.name}</h3>
                  <Link
                    href={paths.project(workspace.id, project.id)}
                    className={`${textLinkClass} mt-3 inline-flex`}
                  >
                    Open project
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

appPage(WorkspaceShow, (props) => props.workspace.name);

export default WorkspaceShow;
