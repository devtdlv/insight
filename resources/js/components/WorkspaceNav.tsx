import { Link } from '@inertiajs/react';
import { paths } from '../lib/paths.ts';
import type { WorkspaceDetail } from '../types/index.ts';

const itemClass = (current: boolean) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium motion-safe:transition-colors ${
    current
      ? 'bg-accent-soft text-accent'
      : 'text-muted hover:bg-surface-muted hover:text-ink'
  }`;

export function WorkspaceNav({
  workspace,
  current,
}: {
  workspace: WorkspaceDetail;
  current: 'overview' | 'projects' | 'members' | 'settings';
}) {
  const items: {
    id: 'overview' | 'projects' | 'members' | 'settings';
    href: string;
    label: string;
  }[] = [
    {
      id: 'overview',
      href: paths.workspace(workspace.id),
      label: 'Overview',
    },
    {
      id: 'projects',
      href: paths.projects(workspace.id),
      label: 'Projects',
    },
    {
      id: 'members',
      href: paths.workspaceMembers(workspace.id),
      label: 'Members',
    },
  ];

  if (workspace.canManage) {
    items.push({
      id: 'settings',
      href: paths.workspaceSettings(workspace.id),
      label: 'Settings',
    });
  }

  return (
    <nav aria-label="Workspace" className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === current ? 'page' : undefined}
          className={itemClass(item.id === current)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
