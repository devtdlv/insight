import { Link } from '@inertiajs/react';
import { Badge } from './Badge.tsx';
import { Icon, type IconName } from './Icon.tsx';

type SoonItem = {
  type: 'soon';
  label: string;
  icon: IconName;
};

type LinkItem = {
  type: 'link';
  href: string;
  label: string;
  icon: IconName;
};

const sections: { label: string; items: (LinkItem | SoonItem)[] }[] = [
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
      { type: 'soon', label: 'Workspaces', icon: 'workspaces' },
      { type: 'soon', label: 'Projects', icon: 'projects' },
      { type: 'soon', label: 'Events', icon: 'events' },
      { type: 'soon', label: 'Funnels', icon: 'funnels' },
      { type: 'soon', label: 'Retention', icon: 'retention' },
    ],
  },
  {
    label: 'Account',
    items: [{ type: 'soon', label: 'Settings', icon: 'settings' }],
  },
];

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
      {sections.map((section) => (
        <div key={section.label} className="pt-4 first:pt-0">
          <p className="px-3 pb-2 text-xs font-medium text-sidebar-muted">
            {section.label}
          </p>
          <ul className="grid gap-1">
            {section.items.map((item) => (
              <li key={item.label}>
                {item.type === 'link' ? (
                  <Link
                    href={item.href}
                    aria-current={path === item.href ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium motion-safe:transition-colors ${
                      path === item.href
                        ? 'bg-sidebar-active text-sidebar-ink'
                        : 'text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-ink'
                    }`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted">
                    <Icon name={item.icon} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <span className="sr-only">, coming soon</span>
                    <span aria-hidden="true">
                      <Badge tone="inverse">Soon</Badge>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
