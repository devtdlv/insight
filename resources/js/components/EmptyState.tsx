import type { ReactNode } from 'react';
import { Card } from './Card.tsx';

export function EmptyState({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      {eyebrow ? (
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl text-ink">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {description}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </Card>
  );
}
