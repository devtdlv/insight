import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { AuthActions } from '../components/AuthActions.tsx';
import { Brand } from '../components/Brand.tsx';
import { SkipLink } from '../components/SkipLink.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import type { SharedProps } from '../types/index.ts';

export function PublicLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const user = usePage<SharedProps>().props.auth.user;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Head title={title} />
      <SkipLink />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand href="/" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            <AuthActions user={user} />
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
          <p>
            Account sign-in, event tracking, and project analytics are
            available. Funnels, retention, and journeys are planned.
          </p>
        </div>
      </footer>
    </div>
  );
}
