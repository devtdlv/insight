import { Link, usePage } from '@inertiajs/react';
import { Badge } from '../components/Badge.tsx';
import { Card } from '../components/Card.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { appPage } from '../layouts/appPage.ts';
import { buttonClass } from '../lib/buttonStyles.ts';
import { paths, roleLabel } from '../lib/paths.ts';
import type { SharedProps } from '../types/index.ts';

const steps = [
  {
    title: 'Organize products',
    detail:
      'Create a workspace, then add the websites or applications you want to understand.',
  },
  {
    title: 'Send events',
    detail:
      'Add the Insight SDK to an application. Each project has a tracking setup page.',
  },
  {
    title: 'Read project analytics',
    detail:
      'Each project overview shows its totals, activity chart, and top events.',
  },
] as const;

function Dashboard() {
  const workspaces = usePage<SharedProps>().props.workspaces ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Open a project to see its events, visitors, and activity."
      />
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-ink">Your workspaces</h2>
          <Link
            href={paths.workspaceCreate()}
            className={buttonClass('primary')}
          >
            Create a workspace
          </Link>
        </div>
        {workspaces.length === 0 ? (
          <EmptyState
            title="No workspaces yet"
            description="Create a workspace to add projects. Insight does not create one for you when you sign in."
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg text-ink">{workspace.name}</h3>
                    <Badge>{roleLabel(workspace.role)}</Badge>
                  </div>
                  <Link
                    href={paths.workspace(workspace.id)}
                    className={`${buttonClass('secondary')} mt-4`}
                  >
                    Open workspace
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <EmptyState
        eyebrow="Project analytics"
        title="Find your product data in each project"
        description="A project overview shows total events, unique visitors, identified users, events per visitor, an activity chart, top events, and date ranges. Recent events are listed on the project's Events page."
      >
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-lg bg-canvas px-3 py-3">
              <span className="text-sm font-semibold text-accent">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </EmptyState>
    </>
  );
}

appPage(Dashboard, 'Dashboard');

export default Dashboard;
