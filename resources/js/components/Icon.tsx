import type { ReactNode } from 'react';

export type IconName =
  | 'dashboard'
  | 'workspaces'
  | 'projects'
  | 'events'
  | 'funnels'
  | 'retention'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'monitor';

const paths: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  workspaces: (
    <>
      <path d="M4 18.5V8.5A2.5 2.5 0 0 1 6.5 6H11l1.5 2H17.5A2.5 2.5 0 0 1 20 10.5V18.5" />
      <path d="M4 18.5h16" />
    </>
  ),
  projects: (
    <>
      <path d="M5 7.5h5l1.5 2H19a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18.5v-9A1.5 1.5 0 0 1 5 8z" />
    </>
  ),
  events: (
    <>
      <path d="M4 12h3.5l2-5 3.5 10 2.2-5H20" />
    </>
  ),
  funnels: (
    <>
      <path d="M4 5h16l-5.2 7.2V19l-5.6-2v-4.8L4 5z" />
    </>
  ),
  retention: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5V8h-3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 8h10" />
      <path d="M18 8h2" />
      <circle cx="16" cy="8" r="2" />
      <path d="M4 16h2" />
      <path d="M10 16h10" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  moon: <path d="M16.5 14.5A6.5 6.5 0 0 1 9 5.2 6.5 6.5 0 1 0 16.5 14.5z" />,
  monitor: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </>
  ),
};

export function Icon({
  name,
  className = 'size-4',
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {paths[name]}
    </svg>
  );
}
