import { Link } from '@inertiajs/react';
import { Icon, type IconName } from './Icon.tsx';

type LinkItem = {
  type: 'link';
  href: string;
  label: string;
  icon: IconName;
};

const sectionsFor = (path: string): { label: string; items: LinkItem[] }[] => {
  const workspaceId = path.match(/^\/workspaces\/(\d+)/)?.[1];
  const projectId = path.match(/^\/workspaces\/\d+\/projects\/(\d+)/)?.[1];
  const projectsHref = workspaceId
    ? `/workspaces/${workspaceId}/projects`
    : '/workspaces';
  const eventsHref =
    workspaceId && projectId
      ? `/workspaces/${workspaceId}/projects/${projectId}/events`
      : '/workspaces';

  return [
    {
      label: 'Overview',
      items: [
        {
          type: 'link',
          href: '/dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
        },
      ],
    },
    {
      label: 'Product',
      items: [
        {
          type: 'link',
          href: '/workspaces',
          label: 'Workspaces',
          icon: 'workspaces',
        },
        {
          type: 'link',
          href: projectsHref,
          label: 'Projects',
          icon: 'projects',
        },
        {
          type: 'link',
          href: eventsHref,
          label: 'Events',
          icon: 'events',
        },
      ],
    },
  ];
};

function isCurrent(path: string, item: LinkItem): boolean {
  if (item.label === 'Dashboard') {
    return path === '/dashboard';
  }

  if (item.label === 'Workspaces') {
    return (
      path === '/workspaces' ||
      path === '/workspaces/create' ||
      /^\/workspaces\/\d+(\/(settings|members))?$/.test(path)
    );
  }

  if (item.label === 'Projects') {
    return /\/projects(\/|$)/.test(path) && !/\/events$/.test(path);
  }

  if (item.label === 'Events') {
    return /\/events$/.test(path);
  }

  return path === item.href;
}

export function SidebarNav({
  path,
  onNavigate,
  className = '',
}: {
  path: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav aria-label="Primary" className={className}>
      {sectionsFor(path).map((section) => (
        <div key={section.label} className="pt-4 first:pt-0">
          <p className="px-3 pb-2 text-xs font-medium text-sidebar-muted">
            {section.label}
          </p>
          <ul className="grid gap-1">
            {section.items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={isCurrent(path, item) ? 'page' : undefined}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
                    isCurrent(path, item)
                      ? 'bg-sidebar-active text-sidebar-ink'
                      : 'text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-ink'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
