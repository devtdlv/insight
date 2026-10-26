import { Link, usePage } from '@inertiajs/react';
import { Badge } from '../../components/Badge.tsx';
import { Card } from '../../components/Card.tsx';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { appPage } from '../../layouts/appPage.ts';
import { buttonClass } from '../../lib/buttonStyles.ts';
import { paths, roleLabel } from '../../lib/paths.ts';
import type { SharedProps } from '../../types/index.ts';

function WorkspaceIndex() {
  const { workspaces } = usePage<SharedProps>().props;

  return (
    <>
      <PageHeader
        eyebrow="Workspaces"
        title="Your workspaces"
        description="A workspace groups the products you want to understand. Insight does not show product metrics on this page."
      />
      <div>
        <Link href={paths.workspaceCreate()} className={buttonClass('primary')}>
          Create a workspace
        </Link>
      </div>
      {workspaces.length === 0 ? (
        <EmptyState
          eyebrow="No workspaces yet"
          title="Create your first workspace"
          description="You become the owner. Signing in does not create a workspace for you."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl text-ink">{workspace.name}</h2>
                  <Badge>{roleLabel(workspace.role)}</Badge>
                </div>
                <Link
                  href={paths.workspace(workspace.id)}
                  className={`${buttonClass('secondary')} mt-5`}
                >
                  Open workspace
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

appPage(WorkspaceIndex, 'Workspaces');

export default WorkspaceIndex;
