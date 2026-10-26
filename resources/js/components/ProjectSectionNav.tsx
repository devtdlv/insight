import { Link } from '@inertiajs/react';
import { paths } from '../lib/paths.ts';

const itemClass = (current: boolean) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium motion-safe:transition-colors ${
    current
      ? 'bg-accent-soft text-accent'
      : 'text-muted hover:bg-surface-muted hover:text-ink'
  }`;

export function ProjectSectionNav({
  workspaceId,
  projectId,
  canManage,
  current,
}: {
  workspaceId: number;
  projectId: number;
  canManage: boolean;
  current: 'overview' | 'events' | 'tracking' | 'settings';
}) {
  const items: {
    id: 'overview' | 'events' | 'tracking' | 'settings';
    href: string;
    label: string;
  }[] = [
    {
      id: 'overview',
      href: paths.project(workspaceId, projectId),
      label: 'Overview',
    },
    {
      id: 'events',
      href: paths.projectEvents(workspaceId, projectId),
      label: 'Events',
    },
    {
      id: 'tracking',
      href: paths.projectTracking(workspaceId, projectId),
      label: 'Tracking',
    },
  ];

  if (canManage) {
    items.push({
      id: 'settings',
      href: paths.projectSettings(workspaceId, projectId),
      label: 'Settings',
    });
  }

  return (
    <nav aria-label="Project" className="flex flex-wrap gap-2">
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
