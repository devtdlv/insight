import type { ReactNode } from 'react';

const tones = {
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-surface-muted text-muted',
  inverse: 'bg-sidebar-active text-sidebar-muted',
} as const;

export function Badge({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
